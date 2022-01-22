import * as core from '@actions/core';
import * as github from '@actions/github';
import Minimatch from 'minimatch';
import { PullRequestEvent } from '@octokit/webhooks-types';
import { readFileSync } from 'fs';

type GithubClient = ReturnType<typeof github.getOctokit>;

const getMilestoneNumber = async (
  client: GithubClient,
  milestoneName: string,
  useGlobExpression?: boolean,
): Promise<number> => {
  const { data: milestones } = await client.rest.issues.listMilestones({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
  });
  core.debug(`Milestones: ${JSON.stringify(milestones)}`);

  const milestone = milestones
    .filter(m => !m.due_on || new Date(m.due_on) >= new Date())
    .find(m =>
      useGlobExpression
        ? Minimatch(m.title, milestoneName, { nocase: true, debug: core.isDebug() })
        : m.title === milestoneName,
    );

  // Check if milestone exists
  const milestoneNumber = milestone?.number;
  if (milestoneNumber === undefined) {
    throw new Error(`Milestone with the name "${milestoneName}" was not found.`);
  }
  core.debug(`Using milestone: ${JSON.stringify(milestone)}`);

  return milestoneNumber;
};

const updateIssueWithMilestone = async (
  client: GithubClient,
  prNumber: number,
  milestoneNumber: number,
): Promise<void> => {
  core.info(`Updating pull request #${prNumber} with milestone #${milestoneNumber}`);

  await client.rest.issues.update({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    milestone: milestoneNumber,
  });
};

const isUserPermitted = (usersFilePath: string, authorLogin: string) => {
  if (!usersFilePath) {
    return true;
  }

  const users = readFileSync(usersFilePath, 'utf8')
    .split('\n')
    .map(user => user.trim());

  core.debug(`Users: ${JSON.stringify(users)}`);

  return users.includes(authorLogin);
};

export const assignMilestone = async (): Promise<void> => {
  const eventName = github.context.eventName;
  if (eventName !== 'pull_request') {
    throw new Error(`Please run this only for "pull_request" events, ${eventName} is not a supported event.`);
  }

  const event = github.context.payload as PullRequestEvent;
  if (event.pull_request?.number === undefined) {
    throw new Error('Could not get PR number from the payload.');
  }

  const token = core.getInput('repo-token', { required: true });
  const milestoneName = core.getInput('milestone', { required: true });
  const useGlobExpression = core.getBooleanInput('use-expression', { required: false });
  const allowInactives = core.getBooleanInput('allow-inactive', { required: false });
  const usersFilePath = core.getInput('users-file-path', { required: false });

  core.debug(`Tokens: ${JSON.stringify({ milestoneName, useGlobExpression, allowInactives, usersFilePath })}`);

  // Initialize Github client
  const client: GithubClient = github.getOctokit(token);

  // Check user's work should be in the milestone
  const authorLogin = event.pull_request.user.login;
  if (!isUserPermitted(usersFilePath, authorLogin)) {
    core.debug(`User ${authorLogin} is not in the users file.`);
    return;
  }

  // Get milestone
  const milestoneNumber = await getMilestoneNumber(client, milestoneName, useGlobExpression);

  // Add to milestone
  const prNumber = github.context.payload.pull_request?.number!;
  await updateIssueWithMilestone(client, prNumber, milestoneNumber);
};
