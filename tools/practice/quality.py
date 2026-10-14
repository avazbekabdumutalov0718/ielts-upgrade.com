"""Structural release gates. These do not claim to prove semantic correctness."""
import re
import unicodedata
from inventory import norm

SLOTS = ('gap', 'builder')
META = re.compile(r'\b(the (?:word|phrase|expression|term)|fits naturally|IELTS answer|'
                  r'IELTS discussion|referring to|used to express|'
                  r'target (?:word|phrase|meaning))\b', re.I)


def term_pattern(term):
    parts = [re.escape(p).replace("'", "['’‘]") for p in norm(term).split()]
    return re.compile(r"(?<![\w'’‘−-])" + r'\s+'.join(parts) + r"(?![\w'’‘−-])", re.I)


def tokens(sentence):
    return re.findall(r"[a-z0-9]+(?:'[a-z]+)?", norm(sentence))


def sentence_key(sentence):
    return ' '.join(tokens(sentence))


class Validator:
    def __init__(self, protected=()):
        self.sentences = {}
        self.frames = {}
        self.source_ngrams = set()
        self.protected_keys = set()
        for passage in protected:
            for sentence in re.split(r'(?<=[.!?])\s+', str(passage)):
                key = sentence_key(sentence)
                if key:
                    self.protected_keys.add(key)
            words = tokens(passage)
            self.source_ngrams.update(tuple(words[i:i+9]) for i in range(len(words)-8))

    def check(self, row, remember=True):
        term = row.get('term', '')
        key = norm(term)
        errors = []
        if not term.strip():
            return ['empty_term']
        staged = []
        for slot in SLOTS:
            sentence = row.get(slot, '')
            label = f'{slot}:'
            if not isinstance(sentence, str) or not sentence.strip():
                errors.append(label + 'missing_sentence')
                continue
            sentence = unicodedata.normalize('NFC', sentence).strip()
            count = len(sentence.split())
            if not 12 <= count <= 28:
                errors.append(label + 'length_outside_12_28_words')
            if not sentence[0].isupper() or sentence[-1] not in '.!?':
                errors.append(label + 'incomplete_sentence')
            if '\n' in sentence or '<' in sentence or '____' in sentence:
                errors.append(label + 'invalid_format')
            matches = list(term_pattern(term).finditer(sentence))
            if len(matches) != 1:
                errors.append(label + f'target_occurrences_{len(matches)}')
            if META.search(sentence):
                errors.append(label + 'metalinguistic_template')
            sk = sentence_key(sentence)
            if sk in self.sentences or any(x[0] == sk for x in staged):
                errors.append(label + 'duplicate_sentence')
            if sk in self.protected_keys:
                errors.append(label + 'copied_source_sentence')
            without_target = term_pattern(term).sub(' TARGET ', sentence)
            content = tokens(without_target)
            if any(tuple(content[i:i+9]) in self.source_ngrams for i in range(len(content)-8)):
                errors.append(label + 'copied_source_span')
            frame = sentence_key(without_target)
            if frame in self.frames or any(x[1] == frame for x in staged):
                errors.append(label + 'same_sentence_with_target_swapped')
            staged.append((sk, frame, key + ':' + slot))
        if remember and not errors:
            for sk, frame, identity in staged:
                self.sentences[sk] = identity
                self.frames[frame] = identity
        return errors
