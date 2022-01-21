import * as core from '@actions/core';
import { assignMilestone } from './runner';

export const run = async (): Promise<void> => {
  try {
    await assignMilestone();
  } catch (error: any) {
    core.setFailed(error);
  }
};

run();
