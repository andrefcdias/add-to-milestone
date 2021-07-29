import * as core from '@actions/core';
import * as github from '@actions/github';
import Minimatch from 'minimatch';

type GithubClient = ReturnType<typeof github.getOctokit>;

const getPrNumber = (): number => {
  core.debug(`PR context: ${JSON.stringify(github.context.payload.pull_request)}`);

  const prNumber = github.context.payload.pull_request?.number;
  if (prNumber === undefined) {
    throw 'Action not run with a PR.';
  }

  return prNumber;
};

const getMilestoneNumber = async (
  client: GithubClient,
  milestoneName: string,
  useGlobExpression?: boolean,
): Promise<number> => {
  const milestones = await client.rest.issues.listMilestones({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
  });
  core.debug(`Milestones: ${JSON.stringify(milestones)}`);

  const milestone = milestones.data.find(m =>
    useGlobExpression
      ? Minimatch(m.title, milestoneName, { nocase: true, debug: core.isDebug() })
      : m.title === milestoneName,
  );

  // Check if milestone exists
  const milestoneNumber = milestone?.number;
  if (milestoneNumber === undefined) {
    throw `Milestone with the name ${milestoneName} was not found.`;
  }
  core.debug(`Using milestone: ${JSON.stringify(milestone)}`);

  return milestoneNumber;
};

const updateIssueWithMilestone = async (
  client: GithubClient,
  prNumber: number,
  milestoneNumber: number,
): Promise<void> => {
  core.info(`Updating pull request ${prNumber} with milestone ${milestoneNumber}`);
  await client.rest.issues.update({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    milestone: milestoneNumber,
  });
};

export const run = async (): Promise<void> => {
  try {
    const token = core.getInput('repo-token', { required: true });
    const useGlobExpression = core.getBooleanInput('use-expression', { required: false });
    const milestoneName = core.getInput('milestone', { required: true });
    core.debug(`Tokens: ${JSON.stringify({ token, milestoneName })}`);

    // Check if PR exists
    const prNumber = getPrNumber();

    // Initialize Github client
    const client: GithubClient = github.getOctokit(token);

    // Get milestone
    const milestoneNumber = await getMilestoneNumber(client, milestoneName, useGlobExpression);

    // Add to milestone
    await updateIssueWithMilestone(client, prNumber, milestoneNumber);
  } catch (error) {
    throw core.setFailed(error);
  }
};

run();
