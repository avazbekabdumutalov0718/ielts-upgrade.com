import unittest
from quality import Validator


class QualityTests(unittest.TestCase):
    def row(self, term='profound'):
        return dict(term=term,
                    gap=f'Her visit to the village had a {term} effect on her understanding of poverty.',
                    builder=f'The discovery led to a {term} reassessment of the theory guiding the research team.')

    def test_valid_pair(self):
        self.assertEqual(Validator().check(self.row()), [])

    def test_duplicates_across_cards_and_modes(self):
        v = Validator()
        self.assertEqual(v.check(self.row()), [])
        self.assertIn('gap:duplicate_sentence', v.check(self.row()))
        row = self.row()
        row['builder'] = row['gap']
        self.assertIn('builder:duplicate_sentence', Validator().check(row))

    def test_templates_with_only_target_changed(self):
        v = Validator()
        v.check(self.row())
        self.assertIn('gap:same_sentence_with_target_swapped', v.check(self.row('dramatic')))

    def test_copied_article_and_partial_word(self):
        row = self.row()
        self.assertIn('gap:copied_source_sentence', Validator([row['gap']]).check(row))
        row['term'] = 'found'
        self.assertIn('gap:target_occurrences_0', Validator().check(row))

    def test_duplicate_target_and_missing_target(self):
        row = self.row()
        row['gap'] = 'The profound changes caused profound uncertainty among workers who had expected their jobs to remain secure.'
        self.assertIn('gap:target_occurrences_2', Validator().check(row))
        row['gap'] = 'The new discovery encouraged the research team to examine its assumptions much more carefully.'
        self.assertIn('gap:target_occurrences_0', Validator().check(row))


if __name__ == '__main__':
    unittest.main()
