const moment = require('moment');

const generateBidAlerts = async (db, procurementRequestId) => {
  const procurementRequest = await db.ProcurementRequest.findByPk(procurementRequestId, {
    include: [
      {
        model: db.ProcurementBid,
        as: 'bids',
        include: [
          {
            model: db.User,
            as: 'seller',
            attributes: ['first_name', 'last_name'],
          },
          {
            model: db.AdminLog,
            as: 'adminLogs',
            attributes: ['created_at'],
          },
        ],
      },
    ],
  });

  if (!procurementRequest) {
    throw new Error('Procurement request not found');
  }

  const alerts = [];

  procurementRequest.bids.forEach((bid) => {
    const bidSubmissionTime = moment(bid.submitted_at);
    const procurementCloseTime = moment(procurementRequest.close_at);

    // Uslov 1: Više od 3 izmene na bidu
    if (bid.adminLogs.length > 3) {
      alerts.push({
        alert: `User ${bid.seller.first_name} ${bid.seller.last_name} updated his bid more than 3 times.`,
        procurement_request_id: procurementRequestId,
      });
    }

    // Uslov 2: Bid postavljen manje od 30 minuta pre zatvaranja procurementa
    if (procurementCloseTime.diff(bidSubmissionTime, 'minutes') <= 30) {
      alerts.push({
        alert: `User ${bid.seller.first_name} ${bid.seller.last_name} made a bid with less than 30 minutes before closing the procurement.`,
        procurement_request_id: procurementRequestId,
      });
    }

    // Dodatni uslovi mogu se dodati ovde...
  });

  if (alerts.length > 0) {
    await db.AdminAlert.bulkCreate(alerts);
  }
};
