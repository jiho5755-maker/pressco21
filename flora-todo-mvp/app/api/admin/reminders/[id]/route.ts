import { reminderRepository } from "@/src/db/repositories/reminderRepository";

type ReminderPatchBody = {
  title?: string;
  remindAt?: string | null;
  kind?: string;
  message?: string | null;
  status?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as ReminderPatchBody;
    const updatedReminder = await reminderRepository.patchById(id, {
      title: body.title,
      remindAt: body.remindAt ? new Date(body.remindAt) : body.remindAt === null ? null : undefined,
      kind: body.kind,
      message: body.message,
      status: body.status,
    });

    if (!updatedReminder) {
      return Response.json({ ok: false, error: "Reminder not found" }, { status: 404 });
    }

    return Response.json({ ok: true, reminder: updatedReminder });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const deletedReminder = await reminderRepository.deleteById(id);

    if (!deletedReminder) {
      return Response.json({ ok: false, error: "Reminder not found" }, { status: 404 });
    }

    return Response.json({ ok: true, reminder: deletedReminder });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
