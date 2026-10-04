/*
 * VIVID IELTS — local Supabase compatibility client
 * -------------------------------------------------
 * Purpose:
 *   - Removes the runtime dependency on jsDelivr / unpkg / esm.sh.
 *   - Keeps the existing VIVID IELTS cloud.js API working.
 *   - Uses only the public/publishable Supabase key from supabase-config.js.
 *
 * Expected config (loaded by supabase-config.js):
 *   window.VOCAB_SUPABASE = { url: 'https://....supabase.co', key: 'sb_publishable_...' }
 *
 * Supported by this file:
 *   auth.getSession()
 *   auth.getUser()
 *   auth.signInWithPassword()
 *   auth.signUp()
 *   auth.signInWithOAuth()
 *   auth.resetPasswordForEmail()
 *   auth.signOut()
 *   from(...).select(...).eq(...).maybeSingle()
 *   from(...).upsert(...)
 *   storage.from(...).upload(...)
 *   storage.from(...).download(...)
 *
 * No service-role key is used or required.
 */
(() => {
  'use strict';

  const VERSION = 'v29-local-rest-client-2026-10-04';
  const DEFAULT_TIMEOUT = 15000;

  class SupabaseCompatError extends Error {
    constructor(message, details = {}) {
      super(message || 'Supabase request failed.');
      this.name = details.name || 'SupabaseError';
      this.code = details.code || '';
      this.status = details.status || 0;
      this.details = details.details || null;
      this.hint = details.hint || null;
    }
  }

  function timeoutSignal(ms = DEFAULT_TIMEOUT) {
    if (
      typeof AbortSignal !== 'undefined' &&
      typeof AbortSignal.timeout === 'function'
    ) {
      return AbortSignal.timeout(ms);
    }

    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }

  function safeJsonParse(value) {
    if (!value || typeof value !== 'string') return null;

    try {
      return JSON.parse(value);
    } catch {}

    if (value.startsWith('base64-')) {
      try {
        const raw = value
          .slice(7)
          .replace(/-/g, '+')
          .replace(/_/g, '/');

        const padded =
          raw + '='.repeat((4 - (raw.length % 4)) % 4);

        return JSON.parse(
          decodeURIComponent(
            escape(
              atob(padded)
            )
          )
        );
      } catch {}
    }

    return null;
  }

  function decodeJwtPayload(token) {
    try {
      const part = String(token || '').split('.')[1];
      if (!part) return null;

      const raw = part
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const padded =
        raw + '='.repeat((4 - (raw.length % 4)) % 4);

      return JSON.parse(
        decodeURIComponent(
          escape(
            atob(padded)
          )
        )
      );
    } catch {
      return null;
    }
  }

  function normalizeBaseUrl(url) {
    return String(url || '')
      .trim()
      .replace(/\/+$/, '');
  }

  function projectRefFromUrl(url) {
    try {
      const host = new URL(url).hostname;
      return host.split('.')[0] || 'vivid';
    } catch {
      return 'vivid';
    }
  }

  function normalizeSession(raw) {
    if (!raw || typeof raw !== 'object' || !raw.access_token) {
      return null;
    }

    const jwt = decodeJwtPayload(raw.access_token);
    const expiresIn = Number(raw.expires_in || 3600);

    let expiresAt = Number(raw.expires_at || 0);

    if (!expiresAt && jwt?.exp) {
      expiresAt = Number(jwt.exp);
    }

    if (!expiresAt) {
      expiresAt =
        Math.floor(Date.now() / 1000) + expiresIn;
    }

    return {
      ...raw,
      token_type: raw.token_type || 'bearer',
      expires_in: expiresIn,
      expires_at: expiresAt,
      user: raw.user || null,
    };
  }

  function authErrorFromPayload(payload, status) {
    const message =
      payload?.msg ||
      payload?.message ||
      payload?.error_description ||
      payload?.error ||
      `Request failed (${status}).`;

    const code =
      payload?.code ||
      payload?.error_code ||
      '';

    return new SupabaseCompatError(message, {
      name: payload?.name || 'AuthApiError',
      code,
      status,
      details: payload,
    });
  }

  function restErrorFromPayload(payload, status) {
    return new SupabaseCompatError(
      payload?.message ||
        payload?.error ||
        `Database request failed (${status}).`,
      {
        name: 'PostgrestError',
        code: payload?.code || '',
        status,
        details: payload?.details || payload,
        hint: payload?.hint || null,
      }
    );
  }

  async function parseResponse(response) {
    if (response.status === 204) {
      return null;
    }

    const contentType =
      response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    try {
      return await response.text();
    } catch {
      return null;
    }
  }

  function createClient(url, key, options = {}) {
    const baseUrl = normalizeBaseUrl(url);
    const apiKey = String(key || '').trim();

    if (!baseUrl || !apiKey) {
      throw new SupabaseCompatError(
        'Supabase URL yoki publishable key topilmadi.'
      );
    }

    const projectRef =
      projectRefFromUrl(baseUrl);

    const storageKey =
      options?.auth?.storageKey ||
      `sb-${projectRef}-auth-token`;

    const fallbackStorageKey =
      `vivid-supabase-session:${projectRef}`;

    const persistSession =
      options?.auth?.persistSession !== false;

    const autoRefreshToken =
      options?.auth?.autoRefreshToken !== false;

    const detectSessionInUrl =
      options?.auth?.detectSessionInUrl !== false;

    let memorySession = null;
    let refreshTimer = null;
    let initPromise = null;
    let refreshPromise = null;

    function readStoredSession() {
      if (memorySession) {
        return memorySession;
      }

      if (!persistSession) {
        return null;
      }

      try {
        const primary =
          safeJsonParse(
            localStorage.getItem(storageKey)
          );

        const fallback =
          safeJsonParse(
            localStorage.getItem(
              fallbackStorageKey
            )
          );

        const raw =
          primary?.currentSession ||
          primary?.session ||
          primary ||
          fallback?.currentSession ||
          fallback?.session ||
          fallback;

        const session =
          normalizeSession(raw);

        if (session) {
          memorySession = session;
        }
      } catch {}

      return memorySession;
    }

    function clearRefreshTimer() {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = null;
    }

    function scheduleRefresh(session) {
      clearRefreshTimer();

      if (
        !autoRefreshToken ||
        !session?.refresh_token ||
        !session?.expires_at
      ) {
        return;
      }

      const ms = Math.max(
        5000,
        Number(session.expires_at) * 1000 -
          Date.now() -
          60000
      );

      refreshTimer = setTimeout(() => {
        refreshSession(
          session.refresh_token
        ).catch(error => {
          console.warn(
            '[VIVID IELTS] Supabase token refresh:',
            error?.message || error
          );
        });
      }, Math.min(ms, 2147483647));
    }

    function persist(session) {
      memorySession =
        normalizeSession(session);

      if (persistSession) {
        try {
          if (memorySession) {
            const json =
              JSON.stringify(memorySession);

            localStorage.setItem(
              storageKey,
              json
            );

            localStorage.setItem(
              fallbackStorageKey,
              json
            );
          } else {
            localStorage.removeItem(
              storageKey
            );

            localStorage.removeItem(
              fallbackStorageKey
            );
          }
        } catch {}
      }

      scheduleRefresh(memorySession);

      return memorySession;
    }

    async function authFetch(
      path,
      init = {}
    ) {
      let response;

      try {
        response = await fetch(
          `${baseUrl}/auth/v1${path}`,
          {
            ...init,
            headers: {
              apikey: apiKey,
              'Content-Type':
                'application/json',
              ...(init.headers || {}),
            },
            signal:
              init.signal ||
              timeoutSignal(),
          }
        );
      } catch (error) {
        throw new SupabaseCompatError(
          error?.name === 'TimeoutError' ||
          error?.name === 'AbortError'
            ? 'Supabase serveriga ulanish vaqti tugadi.'
            : 'Supabase serveriga ulanib bo‘lmadi.',
          {
            name:
              'AuthRetryableFetchError',
            details: error,
          }
        );
      }

      const payload =
        await parseResponse(response);

      if (!response.ok) {
        throw authErrorFromPayload(
          payload,
          response.status
        );
      }

      return payload;
    }

    async function refreshSession(
      refreshToken
    ) {
      if (!refreshToken) {
        throw new SupabaseCompatError(
          'Refresh token topilmadi.',
          {
            name:
              'AuthSessionMissingError',
          }
        );
      }

      if (refreshPromise) {
        return refreshPromise;
      }

      refreshPromise = (async () => {
        const payload = await authFetch(
          '/token?grant_type=refresh_token',
          {
            method: 'POST',
            body: JSON.stringify({
              refresh_token:
                refreshToken,
            }),
          }
        );

        return persist(payload);
      })().finally(() => {
        refreshPromise = null;
      });

      return refreshPromise;
    }

    async function consumeAuthCallback() {
      if (
        !detectSessionInUrl ||
        typeof location === 'undefined'
      ) {
        return readStoredSession();
      }

      const hash =
        new URLSearchParams(
          String(
            location.hash || ''
          ).replace(/^#/, '')
        );

      const accessToken =
        hash.get('access_token');

      const refreshToken =
        hash.get('refresh_token');

      if (accessToken) {
        const userPayload =
          await (async () => {
            try {
              const response =
                await fetch(
                  `${baseUrl}/auth/v1/user`,
                  {
                    headers: {
                      apikey: apiKey,
                      Authorization:
                        `Bearer ${accessToken}`,
                    },
                    signal:
                      timeoutSignal(),
                  }
                );

              if (!response.ok) {
                return null;
              }

              return await response.json();
            } catch {
              return null;
            }
          })();

        const session =
          persist({
            access_token:
              accessToken,
            refresh_token:
              refreshToken || '',
            token_type:
              hash.get(
                'token_type'
              ) || 'bearer',
            expires_in:
              Number(
                hash.get(
                  'expires_in'
                ) || 3600
              ),
            expires_at:
              Number(
                hash.get(
                  'expires_at'
                ) || 0
              ),
            user:
              userPayload || null,
          });

        try {
          const clean =
            `${location.pathname}${location.search || ''}`;

          history.replaceState(
            {},
            document.title,
            clean
          );
        } catch {}

        return session;
      }

      const errorDescription =
        hash.get(
          'error_description'
        ) ||
        hash.get('error');

      if (errorDescription) {
        try {
          history.replaceState(
            {},
            document.title,
            `${location.pathname}${location.search || ''}`
          );
        } catch {}

        throw new SupabaseCompatError(
          errorDescription,
          {
            name:
              'AuthApiError',
          }
        );
      }

      return readStoredSession();
    }

    async function initialize() {
      if (!initPromise) {
        initPromise =
          consumeAuthCallback().catch(
            error => {
              console.warn(
                '[VIVID IELTS] OAuth callback:',
                error?.message ||
                  error
              );

              return readStoredSession();
            }
          );
      }

      return initPromise;
    }

    async function currentSession(
      {
        refreshIfNeeded = true,
      } = {}
    ) {
      await initialize();

      let session =
        readStoredSession();

      if (!session) {
        return null;
      }

      const expiresAt =
        Number(
          session.expires_at || 0
        );

      const nearlyExpired =
        expiresAt &&
        expiresAt * 1000 <=
          Date.now() + 90000;

      if (
        refreshIfNeeded &&
        nearlyExpired &&
        session.refresh_token
      ) {
        try {
          session =
            await refreshSession(
              session.refresh_token
            );
        } catch (error) {
          console.warn(
            '[VIVID IELTS] Session refresh failed:',
            error?.message || error
          );

          if (
            expiresAt * 1000 <=
            Date.now()
          ) {
            persist(null);
          }
        }
      }

      return readStoredSession();
    }

    async function bearerHeaders(
      extra = {}
    ) {
      const session =
        await currentSession();

      return {
        apikey: apiKey,
        Authorization:
          `Bearer ${
            session?.access_token ||
            apiKey
          }`,
        ...extra,
      };
    }

    const auth = {
      async getSession() {
        try {
          const session =
            await currentSession();

          return {
            data: { session },
            error: null,
          };
        } catch (error) {
          return {
            data: {
              session: null,
            },
            error,
          };
        }
      },

      async getUser() {
        const session =
          await currentSession();

        if (
          !session?.access_token
        ) {
          return {
            data: {
              user: null,
            },
            error:
              new SupabaseCompatError(
                'Auth session missing!',
                {
                  name:
                    'AuthSessionMissingError',
                }
              ),
          };
        }

        try {
          const response =
            await fetch(
              `${baseUrl}/auth/v1/user`,
              {
                headers: {
                  apikey: apiKey,
                  Authorization:
                    `Bearer ${session.access_token}`,
                },
                signal:
                  timeoutSignal(),
              }
            );

          const payload =
            await parseResponse(
              response
            );

          if (!response.ok) {
            throw authErrorFromPayload(
              payload,
              response.status
            );
          }

          if (payload) {
            persist({
              ...session,
              user: payload,
            });
          }

          return {
            data: {
              user:
                payload ||
                session.user ||
                null,
            },
            error: null,
          };
        } catch (error) {
          return {
            data: {
              user: null,
            },
            error,
          };
        }
      },

      async signInWithPassword(
        {
          email,
          password,
        } = {}
      ) {
        try {
          const payload =
            await authFetch(
              '/token?grant_type=password',
              {
                method: 'POST',
                body:
                  JSON.stringify({
                    email:
                      String(
                        email || ''
                      ).trim(),
                    password:
                      String(
                        password || ''
                      ),
                  }),
              }
            );

          const session =
            persist(payload);

          return {
            data: {
              user:
                session?.user ||
                null,
              session,
            },
            error: null,
          };
        } catch (error) {
          return {
            data: {
              user: null,
              session: null,
            },
            error,
          };
        }
      },

      async signUp(
        {
          email,
          password,
          options:
            signUpOptions = {},
        } = {}
      ) {
        try {
          const redirectTo =
            signUpOptions
              ?.emailRedirectTo;

          const endpoint =
            redirectTo
              ? `/signup?redirect_to=${encodeURIComponent(
                  redirectTo
                )}`
              : '/signup';

          const payload =
            await authFetch(
              endpoint,
              {
                method: 'POST',
                body:
                  JSON.stringify({
                    email:
                      String(
                        email || ''
                      ).trim(),
                    password:
                      String(
                        password || ''
                      ),
                    data:
                      signUpOptions
                        ?.data || {},
                  }),
              }
            );

          const session =
            payload?.access_token
              ? persist(payload)
              : null;

          const user =
            payload?.user ||
            session?.user ||
            payload ||
            null;

          return {
            data: {
              user,
              session,
            },
            error: null,
          };
        } catch (error) {
          return {
            data: {
              user: null,
              session: null,
            },
            error,
          };
        }
      },

      async signInWithOAuth(
        {
          provider,
          options:
            oauthOptions = {},
        } = {}
      ) {
        try {
          const providerName =
            String(
              provider || ''
            ).trim();

          if (!providerName) {
            throw new SupabaseCompatError(
              'OAuth provider topilmadi.'
            );
          }

          const redirectTo =
            oauthOptions.redirectTo ||
            `${location.origin}${location.pathname}`;

          const query =
            new URLSearchParams({
              provider:
                providerName,
              redirect_to:
                redirectTo,
            });

          if (
            oauthOptions.scopes
          ) {
            query.set(
              'scopes',
              oauthOptions.scopes
            );
          }

          if (
            oauthOptions
              .queryParams &&
            typeof oauthOptions
              .queryParams ===
              'object'
          ) {
            Object.entries(
              oauthOptions.queryParams
            ).forEach(
              ([k, v]) =>
                query.set(
                  k,
                  String(v)
                )
            );
          }

          const authUrl =
            `${baseUrl}/auth/v1/authorize?${query.toString()}`;

          if (
            oauthOptions
              .skipBrowserRedirect
          ) {
            return {
              data: {
                provider:
                  providerName,
                url:
                  authUrl,
              },
              error: null,
            };
          }

          location.assign(
            authUrl
          );

          return {
            data: {
              provider:
                providerName,
              url:
                authUrl,
            },
            error: null,
          };
        } catch (error) {
          return {
            data: {
              provider:
                provider || null,
              url: null,
            },
            error,
          };
        }
      },

      async resetPasswordForEmail(
        email,
        resetOptions = {}
      ) {
        try {
          const redirectTo =
            resetOptions.redirectTo;

          const endpoint =
            redirectTo
              ? `/recover?redirect_to=${encodeURIComponent(
                  redirectTo
                )}`
              : '/recover';

          await authFetch(
            endpoint,
            {
              method: 'POST',
              body:
                JSON.stringify({
                  email:
                    String(
                      email || ''
                    ).trim(),
                }),
            }
          );

          return {
            data: {},
            error: null,
          };
        } catch (error) {
          return {
            data: null,
            error,
          };
        }
      },

      async signOut() {
        const session =
          await currentSession({
            refreshIfNeeded:
              false,
          });

        try {
          if (
            session?.access_token
          ) {
            await authFetch(
              '/logout?scope=global',
              {
                method:
                  'POST',
                headers: {
                  Authorization:
                    `Bearer ${session.access_token}`,
                },
                body:
                  JSON.stringify(
                    {}
                  ),
              }
            );
          }
        } catch (error) {
          console.warn(
            '[VIVID IELTS] Sign out server warning:',
            error?.message || error
          );
        }

        persist(null);

        return {
          error: null,
        };
      },
    };

    class SelectBuilder {
      constructor(
        table,
        columns
      ) {
        this.table = table;
        this.columns =
          columns || '*';
        this.filters = [];
      }

      eq(column, value) {
        this.filters.push([
          column,
          value,
        ]);

        return this;
      }

      async maybeSingle() {
        try {
          const params =
            new URLSearchParams();

          params.set(
            'select',
            this.columns
          );

          this.filters.forEach(
            ([column, value]) =>
              params.append(
                column,
                `eq.${value}`
              )
          );

          params.set(
            'limit',
            '1'
          );

          const headers =
            await bearerHeaders({
              Accept:
                'application/json',
            });

          const response =
            await fetch(
              `${baseUrl}/rest/v1/${encodeURIComponent(
                this.table
              )}?${params.toString()}`,
              {
                headers,
                signal:
                  timeoutSignal(),
              }
            );

          const payload =
            await parseResponse(
              response
            );

          if (!response.ok) {
            throw restErrorFromPayload(
              payload,
              response.status
            );
          }

          const row =
            Array.isArray(payload)
              ? payload[0] ||
                null
              : payload ||
                null;

          return {
            data: row,
            error: null,
          };
        } catch (error) {
          return {
            data: null,
            error,
          };
        }
      }
    }

    function from(table) {
      const tableName =
        String(
          table || ''
        ).trim();

      return {
        select(columns = '*') {
          return new SelectBuilder(
            tableName,
            columns
          );
        },

        async upsert(
          values,
          upsertOptions = {}
        ) {
          try {
            const params =
              new URLSearchParams();

            if (
              upsertOptions.onConflict
            ) {
              params.set(
                'on_conflict',
                upsertOptions.onConflict
              );
            }

            const headers =
              await bearerHeaders({
                'Content-Type':
                  'application/json',
                Prefer:
                  'resolution=merge-duplicates,return=minimal',
              });

            const suffix =
              params.toString()
                ? `?${params.toString()}`
                : '';

            const response =
              await fetch(
                `${baseUrl}/rest/v1/${encodeURIComponent(
                  tableName
                )}${suffix}`,
                {
                  method: 'POST',
                  headers,
                  body:
                    JSON.stringify(
                      values
                    ),
                  signal:
                    timeoutSignal(),
                }
              );

            const payload =
              await parseResponse(
                response
              );

            if (!response.ok) {
              throw restErrorFromPayload(
                payload,
                response.status
              );
            }

            return {
              data: payload,
              error: null,
            };
          } catch (error) {
            return {
              data: null,
              error,
            };
          }
        },
      };
    }

    const storage = {
      from(bucket) {
        const bucketName =
          String(
            bucket || ''
          ).trim();

        return {
          async upload(
            path,
            body,
            uploadOptions = {}
          ) {
            try {
              const headers =
                await bearerHeaders({
                  'Content-Type':
                    uploadOptions.contentType ||
                    body?.type ||
                    'application/octet-stream',

                  'x-upsert':
                    uploadOptions.upsert
                      ? 'true'
                      : 'false',
                });

              const encodedPath =
                String(path || '')
                  .split('/')
                  .map(
                    encodeURIComponent
                  )
                  .join('/');

              const response =
                await fetch(
                  `${baseUrl}/storage/v1/object/${encodeURIComponent(
                    bucketName
                  )}/${encodedPath}`,
                  {
                    method: 'POST',
                    headers,
                    body,
                    signal:
                      timeoutSignal(
                        30000
                      ),
                  }
                );

              const payload =
                await parseResponse(
                  response
                );

              if (
                !response.ok
              ) {
                throw new SupabaseCompatError(
                  payload?.message ||
                    payload?.error ||
                    `Storage upload failed (${response.status}).`,
                  {
                    name:
                      'StorageApiError',
                    status:
                      response.status,
                    details:
                      payload,
                  }
                );
              }

              return {
                data:
                  payload || {
                    path,
                  },
                error: null,
              };
            } catch (error) {
              return {
                data: null,
                error,
              };
            }
          },

          async download(path) {
            try {
              const headers =
                await bearerHeaders();

              const encodedPath =
                String(path || '')
                  .split('/')
                  .map(
                    encodeURIComponent
                  )
                  .join('/');

              const response =
                await fetch(
                  `${baseUrl}/storage/v1/object/${encodeURIComponent(
                    bucketName
                  )}/${encodedPath}`,
                  {
                    headers,
                    signal:
                      timeoutSignal(
                        30000
                      ),
                  }
                );

              if (
                !response.ok
              ) {
                const payload =
                  await parseResponse(
                    response
                  );

                throw new SupabaseCompatError(
                  payload?.message ||
                    payload?.error ||
                    `Storage download failed (${response.status}).`,
                  {
                    name:
                      'StorageApiError',
                    status:
                      response.status,
                    details:
                      payload,
                  }
                );
              }

              return {
                data:
                  await response.blob(),
                error: null,
              };
            } catch (error) {
              return {
                data: null,
                error,
              };
            }
          },
        };
      },
    };

    initialize()
      .then(session =>
        scheduleRefresh(session)
      )
      .catch(() => null);

    return {
      auth,
      from,
      storage,
      __vividCompat: true,
      __version: VERSION,
    };
  }

  function hasCompatibleClient() {
    return !!(
      window.supabase &&
      typeof window.supabase
        .createClient ===
        'function'
    );
  }

  if (!hasCompatibleClient()) {
    window.supabase =
      Object.freeze({
        createClient,
        __vividLocal: true,
        __version: VERSION,
      });
  }

  window.VividSupabaseLoader = {
    async ready() {
      return window.supabase;
    },

    reset() {},

    get loaded() {
      return hasCompatibleClient();
    },

    version: VERSION,
  };

  window.dispatchEvent(
    new CustomEvent(
      'vivid:supabase-ready',
      {
        detail: {
          local: true,
          version: VERSION,
        },
      }
    )
  );
})();
