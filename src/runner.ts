import * as core from '@actions/core';
import * as github from '@actions/github';
import Minimatch from 'minimatch';

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

export const assignMilestone = async (): Promise<void> => {
  // Get inputs
  const token = core.getInput('repo-token', { required: true });
  const useGlobExpression = core.getBooleanInput('use-expression', { required: false });
  const allowInactives = core.getBooleanInput('allow-inactive', { required: false });
  const teams = core
    .getInput('teams', { required: false })
    .split(',')
    .map(t => t.trim());
  const milestoneName = core.getInput('milestone', { required: true });
  core.debug(`Tokens: ${JSON.stringify({ useGlobExpression, allowInactives, teams, milestoneName })}`);

  // Check if run in PR context
  const prNumber = github.context.payload.pull_request?.number;
  if (prNumber === undefined) {
    throw new Error('Action was not run in a PR.');
  }

  // Initialize Github client
  const client: GithubClient = github.getOctokit(token);

  if (teams.length > 0) {
    // Check if owner is in team
    let inTeam = false;

    const promises = teams.map(team => {
      const [org, team_slug] = team.split('/');

      return client.rest.teams.listMembersInOrg({ org, team_slug });
    });

    // TODO: This will fail if any of the promises fails!
    const results = await Promise.all(promises);
    const belongsToTeam = results.some(r => r.data.some(t => t?.id === github.context.repo.owner));
  }
  core.debug(`PR context: ${JSON.stringify(github.context.payload.pull_request)}`);

  // Get milestone
  const milestoneNumber = await getMilestoneNumber(client, milestoneName, useGlobExpression);

  // Add to milestone
  await updateIssueWithMilestone(client, prNumber, milestoneNumber);
};
