import { run } from './main';
import { expect, jest, test } from '@jest/globals';
import * as casual from 'casual';

const pullRequestNumberMock = casual.integer(0);
const getInputFn = jest.fn();
const getBooleanInputFn = jest.fn();
const updateIssueFn = jest.fn();
const listMilestonesFn = jest.fn<any, never>();

jest.mock('@actions/core', () => ({
  ...(jest.requireActual('@actions/core') as {}),
  getInput: () => getInputFn(),
  getBooleanInput: () => getBooleanInputFn(),
}));
jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: ' ',
      repo: ' ',
    },
    payload: {
      pull_request: {
        get number() {
          return pullRequestNumberMock;
        },
      },
    },
  },
  getOctokit: () => ({
    rest: {
      issues: {
        update: updateIssueFn,
        listMilestones: listMilestonesFn,
      },
    },
  }),
}));

test('returns a PR for the given context', async () => {
  // Given
  const mockMilestone = {
    title: casual.title,
    number: casual.integer(0),
  };
  listMilestonesFn.mockResolvedValueOnce({
    data: [mockMilestone],
  });

  getBooleanInputFn.mockReturnValue(false);
  getInputFn.mockReturnValue(mockMilestone.title);

  // When
  await run();

  // Then
  expect(updateIssueFn).toHaveBeenCalledWith(
    expect.objectContaining({
      issue_number: pullRequestNumberMock,
      milestone: mockMilestone.number,
    }),
  );
});

test('returns a PR based on a glob pattern', async () => {
  // Given
  const mockMilestone = {
    title: 'This is a test milestone',
    number: casual.integer(0),
  };
  listMilestonesFn.mockResolvedValueOnce({
    data: [mockMilestone],
  });

  getBooleanInputFn.mockReturnValue(true);
  getInputFn.mockReturnValue('This * milestone');

  // When
  await run();

  // Then
  expect(updateIssueFn).toHaveBeenCalledWith(
    expect.objectContaining({
      issue_number: pullRequestNumberMock,
      milestone: mockMilestone.number,
    }),
  );
});
