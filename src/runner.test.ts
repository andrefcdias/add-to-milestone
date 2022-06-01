import { getBooleanInput, getInput, info } from '@actions/core';
import { expect, jest, test } from '@jest/globals';
import * as casual from 'casual';
import { assignMilestone } from './runner';

jest.mock('@actions/core', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  isDebug: jest.fn(),
  getBooleanInput: jest.fn(),
  getInput: jest.fn(),
}));

const eventNameFn = jest.fn();
const mockPRContext = jest.fn();
const updateIssueFn = jest.fn();
const listMilestonesFn = jest.fn<any>();
const getContentFn = jest.fn<any>();

jest.mock('@actions/github', () => ({
  context: {
    get eventName() {
      return eventNameFn();
    },
    repo: {
      owner: ' ',
      repo: ' ',
    },
    payload: {
      get pull_request() {
        return mockPRContext();
      },
    },
  },
  getOctokit: () => ({
    rest: {
      repos: {
        getContent: getContentFn,
      },
      issues: {
        update: updateIssueFn,
        listMilestones: listMilestonesFn,
      },
    },
  }),
}));

afterEach(() => {
  eventNameFn.mockReset();
  mockPRContext.mockReset();
  updateIssueFn.mockReset();
  listMilestonesFn.mockReset();
  getContentFn.mockReset();
});

test('returns a PR for the given context', async () => {
  // Given
  const pullrequest = {
    number: casual.integer(0),
    user: {
      login: 'username2',
    },
  };
  mockPRContext.mockReturnValue(pullrequest);
  eventNameFn.mockReturnValue('pull_request');

  const milestone = {
    title: casual._title(),
    number: casual.integer(0),
  };
  listMilestonesFn.mockResolvedValueOnce({
    data: [milestone],
  });

  (getBooleanInput as jest.Mock).mockImplementation((inputName: string) => {
    switch (inputName) {
      case 'use-expression':
        return false;
      case 'allow-inactive':
        return false;
    }
  });
  (getInput as jest.Mock).mockImplementation((inputName: string) => {
    switch (inputName) {
      case 'github-token':
        return '';
      case 'milestone':
        return milestone.title;
    }
  });

  // When
  await assignMilestone();

  // Then
  expect(updateIssueFn).toHaveBeenCalledWith(
    expect.objectContaining({
      issue_number: pullrequest.number,
      milestone: milestone.number,
    }),
  );
  expect(info).toHaveBeenNthCalledWith(
    1,
    `Milestones available:
["${milestone.title}"]`,
  );
  expect(info).toHaveBeenNthCalledWith(2, `Using milestone #${milestone.number}: "${milestone.title}"`);
  expect(info).toHaveBeenNthCalledWith(
    3,
    `Updated pull request #${pullrequest.number} with milestone #${milestone.number}`,
  );
});

test.each([['pull_request'], ['pull_request_target']])('supports %s events', async (event: string) => {
  // Given
  const pullrequest = {
    number: casual.integer(0),
    user: {
      login: 'username2',
    },
  };
  mockPRContext.mockReturnValue(pullrequest);
  eventNameFn.mockReturnValue(event);

  const milestone = {
    title: casual._title(),
    number: casual.integer(0),
  };
  listMilestonesFn.mockResolvedValueOnce({
    data: [milestone],
  });

  (getBooleanInput as jest.Mock).mockImplementation((inputName: string) => {
    switch (inputName) {
      case 'use-expression':
        return false;
      case 'allow-inactive':
        return false;
    }
  });
  (getInput as jest.Mock).mockImplementation((inputName: string) => {
    switch (inputName) {
      case 'github-token':
        return '';
      case 'milestone':
        return milestone.title;
    }
  });

  // When / Then
  try {
    await assignMilestone();
  } catch (error) {
    expect(error).toBeUndefined();
  }
});

test('fails to run outside of PRs', async () => {
  // Given
  eventNameFn.mockReturnValue('issues');

  // When/Then
  await expect(assignMilestone()).rejects.toThrow(
    'Please run this only for "pull_request" or "pull_request_target" events, issues is not a supported event.',
  );
});

test('fails to run when lacking pull_request info', async () => {
  // Given
  eventNameFn.mockReturnValue('pull_request');
  mockPRContext.mockReturnValue(undefined);

  // When/Then
  await expect(assignMilestone()).rejects.toThrow('Could not get PR number from the payload.');
});

describe('use-expression', () => {
  test('returns a PR based on a glob pattern', async () => {
    // Given
    const pullrequest = {
      number: casual.integer(0),
      user: {
        login: 'username2',
      },
    };
    mockPRContext.mockReturnValue(pullrequest);
    eventNameFn.mockReturnValue('pull_request');

    const milestone = {
      title: 'This is a test milestone',
      number: casual.integer(0),
    };
    listMilestonesFn.mockResolvedValueOnce({
      data: [milestone],
    });

    (getBooleanInput as jest.Mock).mockImplementation((inputName: string) => {
      switch (inputName) {
        case 'use-expression':
          return true;
        case 'allow-inactive':
          return false;
      }
    });
    (getInput as jest.Mock).mockImplementation((inputName: string) => {
      switch (inputName) {
        case 'github-token':
          return '';
        case 'milestone':
          return 'This * milestone';
      }
    });

    // When
    await assignMilestone();

    // Then
    expect(updateIssueFn).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: pullrequest.number,
        milestone: milestone.number,
      }),
    );
  });
});

describe('allow-inactive', () => {
  test("does not return a PR that's past it's due date", async () => {
    // Given
    mockPRContext.mockReturnValue({
      number: casual.integer(0),
      user: {
        login: 'username2',
      },
    });
    eventNameFn.mockReturnValue('pull_request');

    const milestone = {
      title: 'This is a test milestone',
      number: casual.integer(0),
      due_on: '2000-01-01T00:00:00Z',
    };
    listMilestonesFn.mockResolvedValueOnce({
      data: [milestone],
    });

    (getBooleanInput as jest.Mock).mockImplementation((inputName: string) => {
      switch (inputName) {
        case 'use-expression':
          return false;
        case 'allow-inactive':
          return true;
      }
    });
    (getInput as jest.Mock).mockImplementation((inputName: string) => {
      switch (inputName) {
        case 'github-token':
          return '';
        case 'milestone':
          return milestone.title;
      }
    });

    // When/Then
    await expect(assignMilestone()).rejects.toThrow(
      'Milestone with the name "This is a test milestone" was not found.',
    );
  });
});

describe('users-file-path', () => {
  test('runs if user is in the file', async () => {
    // Given
    const pullrequest = {
      number: casual.integer(0),
      user: {
        login: 'username2',
      },
    };
    mockPRContext.mockReturnValue(pullrequest);
    eventNameFn.mockReturnValue('pull_request');
    getContentFn.mockResolvedValue({
      data: {
        content: `username1
        username2
        username3`,
        encoding: 'utf-8',
      },
    });

    const milestone = {
      title: 'This is a test milestone',
      number: casual.integer(0),
    };
    listMilestonesFn.mockResolvedValue({
      data: [milestone],
    });

    (getBooleanInput as jest.Mock).mockReturnValue(false);
    (getInput as jest.Mock).mockImplementation((inputName: string) => {
      switch (inputName) {
        case 'github-token':
          return '';
        case 'milestone':
          return milestone.title;
        case 'users-file-path':
          return 'mock/file/path.txt';
      }
    });

    // When
    await assignMilestone();

    // Then
    expect(updateIssueFn).toHaveBeenCalledWith(
      expect.objectContaining({
        issue_number: pullrequest.number,
        milestone: milestone.number,
      }),
    );
  });

  test('is not run if user is not in the file', async () => {
    // Given
    const pullrequest = {
      number: casual.integer(0),
      user: {
        login: 'not-in-file',
      },
    };
    mockPRContext.mockReturnValue(pullrequest);
    eventNameFn.mockReturnValue('pull_request');
    getContentFn.mockResolvedValue({
      data: {
        content: `username1
        username3`,
        encoding: 'utf-8',
      },
    });

    const milestone = {
      title: 'This is a test milestone',
      number: casual.integer(0),
    };
    listMilestonesFn.mockResolvedValue({
      data: [milestone],
    });

    (getBooleanInput as jest.Mock).mockReturnValue(false);
    (getInput as jest.Mock).mockImplementation((inputName: string) => {
      switch (inputName) {
        case 'github-token':
          return '';
        case 'milestone':
          return milestone.title;
        case 'users-file-path':
          return 'mock/file/path.txt';
      }
    });

    // When
    await assignMilestone();

    // Then
    expect(updateIssueFn).not.toHaveBeenCalled();
  });
});
