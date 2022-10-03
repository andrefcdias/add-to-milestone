import * as core from '@actions/core';
import * as github from '@actions/github';
import Minimatch from 'minimatch';
import { PullRequestEvent } from '@octokit/webhooks-types';
import { Context } from '@actions/github/lib/context';

type GithubClient = ReturnType<typeof github.getOctokit>;

/**
 * Clear time without messing around with .setHours
 */
const stripTime = (date: Date): Date => new Date(date.toDateString());

const getMilestoneNumber = async (
  client: GithubClient,
  milestoneName: string,
  useGlobExpression?: boolean,
  allowInactives?: boolean,
): Promise<number> => {
  const response = await client.rest.issues.listMilestones({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
  });
  core.debug(`listMilestones response:\n${JSON.stringify(response)}`);
  core.info(`Milestones available:\n${JSON.stringify(response.data.map(milestone => milestone.title))}`);

  const today = stripTime(new Date());
  const milestone = response.data
    .filter(m => !m.due_on || allowInactives || stripTime(new Date(m.due_on)) >= today)
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
  core.debug(`Milestone:\n${JSON.stringify(milestone)}`);
  core.info(`Using milestone #${milestoneNumber}: "${milestone?.title}"`);

  return milestoneNumber;
};

const updateIssueWithMilestone = async (
  client: GithubClient,
  prNumber: number,
  milestoneNumber: number,
): Promise<void> => {
  const response = await client.rest.issues.update({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    milestone: milestoneNumber,
  });
  core.debug(`Issue update response:\n${JSON.stringify(response)}`);
  core.info(`Updated pull request #${prNumber} with milestone #${milestoneNumber}`);
};

const fetchContent = async (client: GithubClient, context: Context, repoPath: string): Promise<string> => {
  const response = (await client.rest.repos.getContent({
    owner: context.repo.owner,
    repo: context.repo.repo,
    path: repoPath,
    ref: context.sha,
  })) as {
    data: {
      content: string;
      encoding: 'utf8' | 'utf-8';
    };
  };
  core.debug(`Fetch users file response:\n${JSON.stringify(response)}`);

  return Buffer.from(response.data.content, response.data.encoding).toString();
};

const isUserPermitted = async (client: GithubClient, context: Context, usersFilePath: string, authorLogin: string) => {
  if (!usersFilePath) {
    return true;
  }

  const fileContent = await fetchContent(client, context, usersFilePath);

  const users = fileContent.split('\n').map(user => user.trim());
  core.debug(`Allowed user list:\n${JSON.stringify(users)}`);

  return users.includes(authorLogin);
};

export const assignMilestone = async (): Promise<void> => {
  const context: Context = github.context;
  if (context.eventName !== 'pull_request' && context.eventName !== 'pull_request_target') {
    throw new Error(
      `Please run this only for "pull_request" or "pull_request_target" events, ${context.eventName} is not a supported event.`,
    );
  }
  core.debug(`Running in a ${context.eventName} event.`);

  const event = github.context.payload as PullRequestEvent;
  if (event.pull_request?.number === undefined) {
    throw new Error('Could not get PR number from the payload.');
  }
  core.debug(`Got PR number ${event.pull_request.number}.`);

  const token = core.getInput('repo-token', { required: true });
  const milestoneName = core.getInput('milestone', { required: true });
  const useGlobExpression = core.getBooleanInput('use-expression', { required: false });
  const allowInactives = core.getBooleanInput('allow-inactive', { required: false });
  const usersFilePath = core.getInput('users-file-path', { required: false });

  core.debug(`Inputs:\n${JSON.stringify({ milestoneName, useGlobExpression, allowInactives, usersFilePath })}`);

  // Initialize Github client
  const client: GithubClient = github.getOctokit(token);

  // Check user's work should be in the milestone
  const authorLogin = event.pull_request.user.login;
  const isPermitted = await isUserPermitted(client, context, usersFilePath, authorLogin);
  if (!isPermitted) {
    core.info(`User ${authorLogin} is not in the users file.`);
    return;
  }
  core.debug(`User ${authorLogin} is in the allowed users.`);

  // Get milestone
  const milestoneNumber = await getMilestoneNumber(client, milestoneName, useGlobExpression, allowInactives);

  // Add to milestone
  const prNumber = github.context.payload.pull_request?.number!;
  await updateIssueWithMilestone(client, prNumber, milestoneNumber);
};
