import { setFailed } from '@actions/core';
import { expect, jest, test } from '@jest/globals';
import { run } from './main';
import { assignMilestone } from './runner';

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
