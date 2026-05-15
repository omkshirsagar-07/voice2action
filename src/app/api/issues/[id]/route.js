import connectToDatabase from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { calculatePriorityScore, serializeIssue } from "@/lib/issue-utils";
import {
  getDepartmentCategories,
  getDepartmentLabel,
  normalizeIssueCategory,
  normalizeIssueStatus,
} from "@/lib/issue-constants";
import { createJsonErrorResponse, readRequestJson } from "@/lib/http";
import Issue from "@/models/Issue";

export async function PATCH(request, context) {
  try {
    await connectToDatabase();
    let currentUser = await getCurrentUser();

    let params = await context.params;
    let body = await readRequestJson(request);

    if (!body) {
      return Response.json({ message: "A valid JSON request body is required." }, { status: 400 });
    }

    if (currentUser?.role !== "admin") {
      return Response.json(
        {
          message: "Only department admins can update issue status.",
        },
        { status: 403 }
      );
    }

    let status = normalizeIssueStatus(body.status);
    let category = body.category ? normalizeIssueCategory(body.category) : null;
    let issue = await Issue.findById(params.id);

    if (!issue) {
      return Response.json({ message: "Issue not found." }, { status: 404 });
    }

    let departmentCategories = getDepartmentCategories(currentUser.department);

    if (currentUser.adminType !== "main" && !departmentCategories.includes(issue.category)) {
      return Response.json(
        {
          message: `This issue is outside the ${getDepartmentLabel(currentUser.department)} department scope.`,
        },
        { status: 403 }
      );
    }

    issue.status = status;

    if (typeof body.title === "string" && body.title.trim()) {
      issue.title = body.title.trim();
    }

    if (typeof body.description === "string" && body.description.trim()) {
      issue.description = body.description.trim();
    }

    if (category) {
      issue.category = category;
    }

    if (typeof body.image === "string") {
      issue.image = body.image;
    }

    issue.priorityScore = calculatePriorityScore(issue);
    await issue.save();

    return Response.json({
      issue: serializeIssue(issue),
      message: "Issue updated successfully.",
    });
  } catch (error) {
    return createJsonErrorResponse(error, "Unable to update issue.");
  }
}
