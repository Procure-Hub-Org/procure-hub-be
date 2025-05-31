const { Notification, Contract, ProcurementRequest } = require('../../database/models');

exports.getNotificationsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await Notification.findAll({
      where: { user_id: userId },
      attributes: ['id', 'contract_id', 'text'],
      include: [
        {
          model: Contract,
          as: 'contract',
          include: [
            {
              model: ProcurementRequest,
              as: 'procurementRequest',
              attributes: ['title'],
            },
          ],
        },
      ],
    });

    const result = notifications.map(n => ({
      id: n.id,
      contract_id: n.contract_id,
      text: n.text,
      procurement_request_title: n.contract?.procurementRequest?.title || null
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
