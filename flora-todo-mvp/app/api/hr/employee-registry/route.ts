import { NextRequest } from "next/server";
import { hrEmployeeRegistryRepository } from "@/src/db/repositories/hrEmployeeRegistryRepository";
import { resolveHrActor, isHrAutomationAuthorized } from "@/src/lib/hr-auth";

/**
 * GET /api/hr/employee-registry — 근로자 명부 조회
 * 관리자: 전체 목록 / 일반 직원: 본인만
 */
export async function GET(request: NextRequest) {
  const hrActor = await resolveHrActor(request);
  const isAutomation = isHrAutomationAuthorized(request);

  if (!hrActor && !isAutomation) {
    return Response.json({ ok: false, error: "인증 실패" }, { status: 401 });
  }

  if (hrActor?.isAdmin || isAutomation) {
    const registries = await hrEmployeeRegistryRepository.listActive();
    return Response.json({ ok: true, registries });
  }

  if (hrActor) {
    const registry = await hrEmployeeRegistryRepository.findByStaffId(
      hrActor.staffId,
    );
    return Response.json({
      ok: true,
      registries: registry ? [registry] : [],
    });
  }

  return Response.json({ ok: false, error: "권한 없음" }, { status: 403 });
}

/**
 * POST /api/hr/employee-registry — 근로자 명부 등록 (관리자 전용)
 */
export async function POST(request: NextRequest) {
  const hrActor = await resolveHrActor(request);
  const isAutomation = isHrAutomationAuthorized(request);

  if (!hrActor?.isAdmin && !isAutomation) {
    return Response.json(
      { ok: false, error: "관리자 권한 필요" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { staffId, fullName, hireDate } = body;

    if (!staffId || !fullName || !hireDate) {
      return Response.json(
        { ok: false, error: "staffId, fullName, hireDate 필수" },
        { status: 400 },
      );
    }

    // 중복 확인
    const existing =
      await hrEmployeeRegistryRepository.findByStaffId(staffId);
    if (existing) {
      return Response.json(
        { ok: false, error: "이미 등록된 직원 (staffId 중복)" },
        { status: 409 },
      );
    }

    const registry = await hrEmployeeRegistryRepository.create(
      {
        staffId,
        fullName,
        gender: body.gender,
        birthDate: body.birthDate,
        address: body.address,
        careerHistory: body.careerHistory,
        jobTitle: body.jobTitle,
        department: body.department,
        jobDescription: body.jobDescription,
        hireDate,
        contractType: body.contractType,
        workType: body.workType,
      },
      hrActor?.staffId ?? "automation",
      hrActor?.staffName ?? "시스템",
    );

    return Response.json({ ok: true, registry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
