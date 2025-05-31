
const getUserNotifications = async (req, res) => {
  const userId = req.params.userId;

  try {
    const notifications = await Notification.findAll({
      where: { user_id: userId },
      attributes: ['id', 'contract_id', 'text'],
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
            }
          ]
        }
      ],
      raw: true
    });

    const response = notifications.map(n => ({
      id: n.id,
      contract_id: n.contract_id,
      text: n.text,
      procurement_request_title: n['contract.procurementRequest.title']
    }));

    return res.status(200).json({ success: true, data: response });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
