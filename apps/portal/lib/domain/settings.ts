export type UserProfileSummary = {
  email: string
  username: string | null
  displayName: string | null
  createdAt: string
  workflowCount: number
  tableCount: number
}

export type DeleteUserDataResult = {
  deletedWorkflows: number
  deletedTables: number
}
