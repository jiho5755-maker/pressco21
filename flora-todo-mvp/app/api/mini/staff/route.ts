import { staffRepository } from "@/src/db/repositories/staffRepository";

export async function GET() {
  const allStaff = await staffRepository.listAll();

  return Response.json({
    ok: true,
    staff: allStaff.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
    })),
  });
}
