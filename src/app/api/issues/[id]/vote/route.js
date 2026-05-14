import connectToDatabase from "@/lib/mongodb";
import { calculatePriorityScore, serializeIssue } from "@/lib/issue-utils";
import { createJsonErrorResponse } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import Issue from "@/models/Issue";
import User from "@/models/User";

export async function POST(_request, context) {
  try {
    await connectToDatabase();
    let currentUser = await getCurrentUser();

    if (!currentUser) {
      return Response.json({ message: "Please sign in to vote." }, { status: 401 });
    }

    let params = await context.params;
    let issue = await Issue.findById(params.id);

    if (!issue) {
      return Response.json({ message: "Issue not found." }, { status: 404 });
    }

    let voteUpdateResult = await User.updateOne(
      {
        _id: currentUser.id,
        votedIssueIds: { $ne: params.id },
      },
      {
        $addToSet: {
          votedIssueIds: params.id,
        },
      }
    );

    if (!voteUpdateResult.modifiedCount) {
      return Response.json({ message: "You already voted for this issue." }, { status: 409 });
    }

    issue.votes += 1;
    issue.priorityScore = calculatePriorityScore(issue);
    await issue.save();

    return Response.json({
      issue: serializeIssue(issue),
      message: "Vote added successfully.",
      votedIssueIds: Array.from(new Set(currentUser.votedIssueIds.concat(params.id))),
    });
  } catch (error) {
    return createJsonErrorResponse(error, "Unable to register vote.");
  }
}
