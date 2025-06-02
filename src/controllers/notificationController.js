const { Notification, Contract, ProcurementRequest, User } = require('../../database/models');

exports.getNotificationsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findByPk(userId);
    const role = user?.role;

    const notifications = await Notification.findAll({
      where: { user_id: userId },
      attributes: ['id', 'contract_id', 'text', 'created_at'],
      include: [
        {
          model: Contract,
          as: 'contract',
          attributes: [],
          include: [
            {
              model: ProcurementRequest,
              as: 'procurementRequest',
              attributes: ['title'],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
      raw: true,
      nest: true
    });

    const formatted = notifications.map(n => ({
      id: n.id,
      contract_id: n.contract_id,
      text: n.text,
      procurement_request_title: n.contract?.procurementRequest?.title ?? null,
      created_at: n.created_at
    }));

    return res.status(200).json({ success: true, data: formatted });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
