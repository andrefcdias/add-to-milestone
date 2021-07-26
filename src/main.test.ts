import { run } from './main';
import { expect, jest, test } from '@jest/globals';
import { getOctokit } from '@actions/github'
import { randomInt } from 'crypto';
import { Mock } from 'jest-mock';
import * as casual from 'casual'

const pullRequestNumberMock = casual.integer(0)
const getInputFn = jest.fn()
const updateIssueFn = jest.fn()
const listMilestonesFn = jest.fn<ReturnType<any>, Parameters<any>>()

jest.mock('@actions/core', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  getInput: () => getInputFn()
}))
jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: " ",
      repo: " "
    },
    payload: {
      pull_request: {
        get number() {
          return pullRequestNumberMock
        }
      }
    }
  },
  getOctokit: () => ({
    rest: {
      issues: {
        update: updateIssueFn,
        listMilestones: listMilestonesFn
      }
    }
  })
}))

test('returns a PR for the given context', async () => {
  // Given
  const mockMilestone = {
    title: casual.title,
    number: casual.integer(0)
  }
  getInputFn.mockReturnValue(mockMilestone.title)
  listMilestonesFn.mockResolvedValueOnce({
    data: [mockMilestone]
  })

  // When
  await run();

  // Then  
  expect(updateIssueFn).toHaveBeenCalledWith(expect.objectContaining({
    issue_number: pullRequestNumberMock,
    milestone: mockMilestone.number
  }))
});
