const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const jwt = require('jsonwebtoken');
// GET /api/users - Listar usuarios con métricas
router.get('/', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ error: 'Token no proporcionado', code: 'TOKEN_MISSING' });
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret'); } catch (e) { return res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID', details: e.message }); }
    const requester = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isAdmin: true } });
    if (!requester?.isAdmin) return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phoneNumber: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: {
            subscriptions: true,
            messagesSent: true,
            ownedChannels: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = users.map(u => ({
      ...u,
      subscribedChannelsCount: u._count.subscriptions,
      messagesCount: u._count.messagesSent,
      ownedChannelsCount: u._count.ownedChannels,
      _count: undefined
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Error listando usuarios', code: 'USERS_LIST_FAILED', details: error.message });
  }
});

// GET /api/users/paged - Lista paginada con búsqueda
router.get('/paged', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ error: 'Token no proporcionado', code: 'TOKEN_MISSING' });
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret'); } catch (e) { return res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID', details: e.message }); }
    const requester = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isAdmin: true } });
    if (!requester?.isAdmin) return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });

    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const q = (req.query.q || '').toString();
    const skip = (page - 1) * limit;

    const where = q ? {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          phoneNumber: true,
          isAdmin: true,
          createdAt: true,
          avatarUrl: true,
          _count: { select: { subscriptions: true, messagesSent: true, ownedChannels: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    const items = users.map(u => ({
      ...u,
      subscribedChannelsCount: u._count.subscriptions,
      messagesCount: u._count.messagesSent,
      ownedChannelsCount: u._count.ownedChannels,
      _count: undefined
    }));

    res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ error: 'Error listando usuarios', code: 'USERS_LIST_PAGED_FAILED', details: error.message });
  }
});

// GET /api/users/:id - Obtener perfil de usuario
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        phoneNumber: true,
        isGuest: true,
        isPhoneVerified: true,
        isAdmin: true,
        createdAt: true,
        verificationCode: true,
        _count: {
          select: {
            subscriptions: true,
            messagesSent: true,
            ownedChannels: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const stats = {
      subscribedChannelsCount: user._count.subscriptions,
      messagesCount: user._count.messagesSent,
      ownedChannelsCount: user._count.ownedChannels,
      pendingApprovalsCount: user.isAdmin ? 3 : 0
    };

    const userProfile = {
      ...user,
      ...stats,
      _count: undefined
    };

    res.json(userProfile);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/users/:id - Actualizar perfil de usuario
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phoneNumber } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        fullName,
        phoneNumber
      },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        phoneNumber: true,
        isAdmin: true
      }
    });

    res.json({
      message: 'Perfil actualizado exitosamente',
      user
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/users/:id/channels/owned - Canales que administra el usuario
router.get('/:id/channels/owned', async (req, res) => {
  try {
    const { id } = req.params;

    const channels = await prisma.channel.findMany({
      where: { ownerId: id },
      include: {
        _count: {
          select: {
            messages: true,
            subscriptions: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(channels);
  } catch (error) {
    console.error('Error obteniendo canales del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/users/:id/subscriptions - Suscripciones del usuario
router.get('/:id/subscriptions', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ error: 'Token no proporcionado', code: 'TOKEN_MISSING' });
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret'); } catch (e) { return res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID', details: e.message }); }
    const requester = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isAdmin: true } });
    if (!requester?.isAdmin) return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });

    const { id } = req.params;
    const subs = await prisma.channelSubscription.findMany({
      where: { userId: id, isActive: true },
      include: { channel: { select: { id: true, title: true, icon: true, logoUrl: true } } },
      orderBy: { subscribedAt: 'desc' }
    });
    res.json(subs);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo suscripciones', code: 'USER_SUBSCRIPTIONS_FAILED', details: error.message });
  }
});

// GET /api/users/:id/approver-assignments - Canales donde es aprobador
router.get('/:id/approver-assignments', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ error: 'Token no proporcionado', code: 'TOKEN_MISSING' });
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret'); } catch (e) { return res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID', details: e.message }); }
    const requester = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isAdmin: true } });
    if (!requester?.isAdmin) return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });

    const { id } = req.params;
    const approvers = await prisma.channelApprover.findMany({
      where: { userId: id, isActive: true },
      include: { channel: { select: { id: true, title: true, icon: true, parentId: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(approvers);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo asignaciones de aprobador', code: 'USER_APPROVERS_FAILED', details: error.message });
  }
});

// GET /api/users/:id/pending-approvals - Mensajes pendientes para aprobar
router.get('/:id/pending-approvals', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ error: 'Token no proporcionado', code: 'TOKEN_MISSING' });
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret'); } catch (e) { return res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID', details: e.message }); }
    const requester = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isAdmin: true } });
    if (!requester?.isAdmin) return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });

    const { id } = req.params;
    const hours = Number(req.query.windowHours || 24);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const messages = await prisma.message.findMany({
      where: {
        createdAt: { gte: since },
        channel: { approvers: { some: { userId: id, isActive: true } } }
      },
      include: {
        sender: { select: { id: true, username: true, fullName: true } },
        channel: { select: { id: true, title: true, icon: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo pendientes de aprobación', code: 'USER_PENDING_APPROVALS_FAILED', details: error.message });
  }
});

// GET /api/users/:id/stats - Estadísticas del usuario
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { isAdmin: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener estadísticas
    const [
      subscribedChannels,
      sentMessages,
      ownedChannels,
      recentActivity
    ] = await Promise.all([
      prisma.channelSubscription.count({
        where: { userId: id, isActive: true }
      }),
      prisma.message.count({
        where: { senderId: id }
      }),
      prisma.channel.count({
        where: { ownerId: id }
      }),
      prisma.message.findMany({
        where: { senderId: id },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          channel: {
            select: { title: true, icon: true }
          }
        }
      })
    ]);

    const stats = {
      subscribedChannelsCount: subscribedChannels,
      messagesCount: sentMessages,
      ownedChannelsCount: ownedChannels,
      pendingApprovalsCount: user.isAdmin ? 3 : 0, // Simulado
      recentActivity
    };

    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/users - Crear usuario (admin)
router.post('/', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ error: 'Token no proporcionado', code: 'TOKEN_MISSING' });
    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret'); } catch (e) { return res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID', details: e.message }); }
    const requester = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isAdmin: true } });
    if (!requester?.isAdmin) return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });

    const { email, username, fullName, phoneNumber, avatarUrl, isAdmin = false, password } = req.body;
    if (!email || !username) return res.status(400).json({ error: 'email y username son requeridos', code: 'VALIDATION_ERROR' });

    const bcrypt = require('bcryptjs');
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const created = await prisma.user.create({
      data: {
        email,
        username,
        fullName: fullName || username,
        phoneNumber: phoneNumber || null,
        avatarUrl: avatarUrl || null,
        isAdmin: !!isAdmin,
        isGuest: false,
        passwordHash
      },
      select: { id: true, email: true, username: true, fullName: true, phoneNumber: true, isAdmin: true, avatarUrl: true, createdAt: true }
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: 'Error creando usuario', code: 'USER_CREATE_FAILED', details: error.message });
  }
});

module.exports = router;
router.post('/:id/messaging-settings', async (req, res) => {
  try {
    const { id } = req.params;
    const { platform, handle, isEnabled = true } = req.body;
    const setting = await prisma.userMessagingSetting.upsert({
      where: { userId_platform: { userId: id, platform } },
      update: { handle: handle || null, isEnabled },
      create: { userId: id, platform, handle: handle || null, isEnabled }
    });
    res.status(201).json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Error configurando plataforma' });
  }
});

router.put('/:id/messaging-settings/:platform', async (req, res) => {
  try {
    const { id, platform } = req.params;
    const { handle, isEnabled, verified } = req.body;
    const setting = await prisma.userMessagingSetting.update({
      where: { userId_platform: { userId: id, platform } },
      data: { handle: handle || null, isEnabled, verified }
    });
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando plataforma' });
  }
});

router.post('/:id/request-verification-code', async (req, res) => {
  try {
    const { id } = req.params;
    const { phoneNumber, username, fullName, avatarUrl } = req.body || {};
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    const updated = await prisma.user.update({
      where: { id },
      data: {
        verificationCode: code,
        verificationCodeExpiresAt: expires,
        phoneNumber: phoneNumber || undefined,
        username: username || undefined,
        fullName: fullName || undefined,
        avatarUrl: avatarUrl || undefined
      },
      select: { id: true, verificationCode: true, verificationCodeExpiresAt: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Error generando código', code: 'CODE_GEN_FAILED', details: error.message });
  }
});

router.post('/:id/register', async (req, res) => {
  try {
    const { id } = req.params;
    const { phoneNumber, username, fullName, avatarUrl, code, email } = req.body;
    const user = await prisma.user.findUnique({ where: { id }, select: { verificationCode: true, verificationCodeExpiresAt: true } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' });
    if (!user.verificationCode || code !== user.verificationCode) return res.status(403).json({ error: 'Código inválido', code: 'INVALID_CODE' });
    if (user.verificationCodeExpiresAt && user.verificationCodeExpiresAt < new Date()) return res.status(403).json({ error: 'Código expirado', code: 'CODE_EXPIRED' });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        phoneNumber: phoneNumber || undefined,
        username: username || undefined,
        fullName: fullName || undefined,
        avatarUrl: avatarUrl || undefined,
        email: email || undefined,
        isPhoneVerified: true,
        isGuest: false,
        verificationCode: null,
        verificationCodeExpiresAt: null
      },
      select: { id: true, email: true, username: true, fullName: true, avatarUrl: true, phoneNumber: true, isPhoneVerified: true, isGuest: true }
    });
    const token = jwt.sign({ sub: updated.id, isAdmin: false }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '30d' });
    res.json({ user: updated, token });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando usuario', code: 'USER_REGISTER_FAILED', details: error.message });
  }
});

router.post('/guest', async (req, res) => {
  try {
    const { deviceId, fullName } = req.body;
    let user = await prisma.user.findUnique({ where: { deviceId }, select: { id: true } });
    if (!user) {
      const email = `${deviceId}@tify.pro`;
      user = await prisma.user.create({
        data: {
          deviceId,
          email,
          username: `guest_${Math.random().toString(36).slice(2,6)}`,
          fullName: fullName || null,
          avatarUrl: null,
          isGuest: true,
          isPhoneVerified: false
        }
      });
    }
    res.status(201).json({ id: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Error creando invitado', code: 'GUEST_CREATE_FAILED', details: error.message });
  }
});