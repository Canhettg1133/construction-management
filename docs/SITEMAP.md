# Sitemap / Route Map — Phase 1

## Desktop Web

### Public Routes
| Route | Method | Mô tả |
|-------|--------|-------|
| `/login` | GET, POST | Đăng nhập |
| `/forgot-password` | GET, POST | Quên mật khẩu |
| `/reset-password/:token` | GET, POST | Đặt lại mật khẩu |

### Protected Routes

#### Dashboard
| Route | Method | Mô tả | Role |
|-------|--------|-------|------|
| `/dashboard` | GET | Dashboard chính | All |

#### Projects
| Route | Method | Mô tả | Role |
|-------|--------|-------|------|
| `/projects` | GET | Danh sách dự án | All |
| `/projects/new` | GET, POST | Tạo dự án mới | Admin |
| `/projects/:id` | GET | Chi tiết dự án — Overview | Project members |
| `/projects/:id/edit` | GET, POST | Sửa dự án | Admin, PM |

#### Project — Members
| Route | Method | Mô tả | Role |
|-------|--------|-------|------|
| `/projects/:id/members` | GET | Danh sách thành viên | Project members |
| `/projects/:id/members/add` | POST | Thêm thành viên | Admin, PM |
| `/projects/:id/members/:memberId` | DELETE | Xóa thành viên | Admin, PM |

#### Project — Daily Reports
| Route | Method | Mô tả | Role |
|-------|--------|-------|------|
| `/projects/:id/reports` | GET | Danh sách báo cáo | Project members |
| `/projects/:id/reports/new` | GET, POST | Tạo báo cáo mới | PM, Site Engineer |
| `/projects/:id/reports/:reportId` | GET | Xem chi tiết báo cáo | Project members |
| `/projects/:id/reports/:reportId/edit` | GET, POST | Sửa báo cáo | Creator, PM |

#### Project — Tasks
| Route | Method | Mô tả | Role |
|-------|--------|-------|------|
| `/projects/:id/tasks` | GET | Danh sách task | Project members |
| `/projects/:id/tasks/new` | GET, POST | Tạo task mới | PM, Site Engineer |
| `/projects/:id/tasks/:taskId` | GET | Xem chi tiết task | Project members |
| `/projects/:id/tasks/:taskId/edit` | GET, POST | Sửa task | Creator, PM |
| `/projects/:id/tasks/:taskId/status` | PATCH | Cập nhật trạng thái | Assignee, PM |

#### Project — Files
| Route | Method | Mô tả | Role |
|-------|--------|-------|------|
| `/projects/:id/files` | GET | Danh sách file | Project members |
| `/projects/:id/files/upload` | POST | Upload file | PM, Site Engineer |
| `/projects/:id/files/:fileId` | GET | Download file | Project members |
| `/projects/:id/files/:fileId` | DELETE | Xóa file | Admin, PM |

#### Users (Admin)
| Route | Method | Mô tả | Role |
|-------|--------|-------|------|
| `/users` | GET | Danh sách user | Admin |
| `/users/new` | GET, POST | Tạo user mới | Admin |
| `/users/:id/edit` | GET, POST | Sửa user | Admin |
| `/users/:id/toggle-status` | PATCH | Khóa/mở user | Admin |
| `/users/:id/reset-password` | POST | Reset mật khẩu | Admin |

#### Audit Logs
| Route | Method | Mô tả | Role |
|-------|--------|-------|------|
| `/audit-logs` | GET | Danh sách audit log | Admin, PM |

#### Settings
| Route | Method | Mô tả | Role |
|-------|--------|-------|------|
| `/settings/profile` | GET, POST | Hồ sơ cá nhân | All |
| `/settings/change-password` | POST | Đổi mật khẩu | All |

---

## Mobile Web (Responsive — tối giản)

| Route | Mô tả |
|-------|-------|
| `/dashboard` | Home — tổng quan |
| `/projects` | Danh sách dự án |
| `/projects/:id` | Chi tiết dự án (tabs rút gọn) |
| `/projects/:id/reports/new` | Tạo báo cáo nhanh |
| `/projects/:id/tasks` | Task được giao |

### Mobile Bottom Navigation
```
[Home] [Projects] [Reports] [Tasks] [Profile]
```
