import { assignMilestone } from './runner';
import { expect, jest, test } from '@jest/globals';
import { setFailed } from '@actions/core';
import { run } from './main';

jest.mock('@actions/core');
jest.mock('./runner');

test('fails CI on exception', async () => {
  // Given
  (assignMilestone as jest.Mock).mockRejectedValueOnce('The assignment failed');

  // When
  await run();

  // Then
  expect(setFailed as jest.Mock).toHaveBeenCalledWith('The assignment failed');
});
