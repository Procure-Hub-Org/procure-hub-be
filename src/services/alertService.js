const moment = require('moment');
const { Sequelize } = require('sequelize');

const generateBidAlerts = async (db, procurementRequestId) => {
  const procurementRequest = await db.ProcurementRequest.findByPk(procurementRequestId, {
    include: [
      {
        model: db.ProcurementBid,
        as: 'procurementBids',
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


  procurementRequest.procurementBids.forEach((bid) => {
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
    const existingAlerts = await db.AdminAlert.findAll({
      where: {
        procurement_request_id: { [Sequelize.Op.in]: alerts.map(alert => alert.procurement_request_id) }
      }
    });

    const newAlerts = alerts.filter(alert => {
      return !existingAlerts.some(existingAlert => existingAlert.procurement_request_id === alert.procurement_request_id);
    });
    
    if (newAlerts.length > 0) {
      await db.AdminAlert.bulkCreate(newAlerts);
    } 
  
    await db.ProcurementRequest.update( { flagged: true }, { where: { id: procurementRequestId } });
  } 
  console.log("ALERTS" + alerts);
};

module.exports = { generateBidAlerts };