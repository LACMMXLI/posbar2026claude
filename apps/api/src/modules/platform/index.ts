// Reino de plataforma (fase 02): solo esqueleto de entidades, sin controladores
// ni servicio propio todavía — el whitelist de la fase lo limita a esto. Los
// tipos ya existen en @posbar/db (PlatformUser, Plan, Subscription) desde la
// migración init_tenancy. El acceso real llega con auth de plataforma (fase 03)
// y planes/suscripciones operativos (fase 04+), siempre a través del único
// punto de escape auditado: TenantPrismaService.withPlatform (ver
// apps/api/src/modules/tenancy/).
export type {
  Plan,
  PlatformRole,
  PlatformUser,
  Subscription,
  SubscriptionStatus,
} from '@posbar/db';
