import { memberRepository } from "./member.repository";
import { NotFoundError, ConflictError, ForbiddenError } from "../../shared/errors";
import { userRepository } from "../users/user.repository";
import { projectRepository } from "../projects/project.repository";
import { auditService } from "../audit/audit.service";
import { AuditEntityType } from "@prisma/client";

export const memberService = {
  async list(projectId: string) {
    return memberRepository.findByProject(projectId);
  },

  async add(projectId: string, userId: string, role: string, requesterId: string) {
    const existing = await memberRepository.findByProjectAndUser(projectId, userId);
    if (existing) throw new ConflictError("User đã là thành viên của dự án");

    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("Không tìm thấy user");

    const project = await projectRepository.findById(projectId);
    if (!project) throw new NotFoundError("Không tìm thấy dự án");

    const member = await memberRepository.create(projectId, userId, role);

    await auditService.log({
      userId: requesterId,
      action: "CREATE",
      entityType: AuditEntityType.PROJECT_MEMBER,
      entityId: member.id,
      description: `Đã thêm thành viên "${user.name}" vào dự án "${project.name}" với vai trò ${role}`,
    });

    return member;
  },

  async updateRole(memberId: string, role: string, requesterId: string) {
    const member = await memberRepository.findById(memberId);
    if (!member) throw new NotFoundError("Không tìm thấy thành viên");
    if (member.userId === requesterId && member.role !== role) {
      throw new ForbiddenError("Không thể tự thay đổi vai trò của chính mình");
    }

    const user = await userRepository.findById(member.userId);
    const project = await projectRepository.findById(member.projectId);
    const updated = await memberRepository.updateRole(memberId, role);

    await auditService.log({
      userId: requesterId,
      action: "UPDATE",
      entityType: AuditEntityType.PROJECT_MEMBER,
      entityId: memberId,
      description: `Đã đổi vai trò thành viên "${user?.name ?? member.userId}" trong dự án "${project?.name ?? member.projectId}" sang ${role}`,
    });

    return updated;
  },

  async remove(memberId: string, requesterId: string) {
    const member = await memberRepository.findById(memberId);
    if (!member) throw new NotFoundError("Không tìm thấy thành viên");

    const user = await userRepository.findById(member.userId);
    const project = await projectRepository.findById(member.projectId);

    await memberRepository.delete(memberId);

    await auditService.log({
      userId: requesterId,
      action: "DELETE",
      entityType: AuditEntityType.PROJECT_MEMBER,
      entityId: memberId,
      description: `Đã xóa thành viên "${user?.name ?? member.userId}" khỏi dự án "${project?.name ?? member.projectId}"`,
    });
  },
};
