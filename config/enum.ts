export enum MemberRole {
  ADMINISTRATOR = 'ADMIN',
  PROJECT_MANAGER = 'PM',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export enum BoardInvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export enum StatusColor {
  RED = 'RED',
  ORANGE = 'ORANGE',
  PINK = 'PINK',
  INDIGO = 'INDIGO',
  BLUE = 'BLUE',
  TEAL = 'TEAL',
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  BRIGHT_RED = 'BRIGHT_RED',
  BLACK = 'BLACK',
}

export enum PRIORITY {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
}

export enum NotificationType {
  CARD_ASSIGNED = 'CARD_ASSIGNED',
  CARD_UPDATED = 'CARD_UPDATED',
  CARD_STATUS_CHANGED = 'CARD_STATUS_CHANGED',
  COMMENT_MENTIONED = 'COMMENT_MENTIONED',
  BOARD_INVITED = 'BOARD_INVITED',
  INVITATION_ACCEPTED = 'INVITATION_ACCEPTED',
  MEMBER_ROLE_CHANGED = 'MEMBER_ROLE_CHANGED',
  CARD_DUE_SOON = 'CARD_DUE_SOON',
  CARD_OVERDUE = 'CARD_OVERDUE',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
}

/** Mirror SessionEndReason của BE (README 4.2/4.6); dùng enum thay string literal theo rule enum-usage. */
export enum NotificationSessionReason {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  LOGGED_OUT = 'LOGGED_OUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
}
