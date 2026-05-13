import connectToDatabase from "@/lib/mongodb";
import { calculatePriorityScore, serializeIssue } from "@/lib/issue-utils";
import { createJsonErrorResponse } from "@/lib/http";
import Issue from "@/models/Issue";

export async function POST(_request, context) {
  try {
    await connectToDatabase();

    let params = await context.params;
    let issue = await Issue.findById(params.id);

    if (!issue) {
      return Response.json({ message: "Issue not found." }, { status: 404 });
    }

    issue.votes += 1;
    issue.priorityScore = calculatePriorityScore(issue);
    await issue.save();

    return Response.json({
      issue: serializeIssue(issue),
      message: "Vote added successfully.",
    });
  } catch (error) {
    return createJsonErrorResponse(error, "Unable to register vote.");
  }
}
