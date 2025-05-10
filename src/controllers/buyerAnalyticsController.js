const {
  ProcurementBid,
  ProcurementRequest,
  ProcurementCategory,
  EvaluationCriteria,
  CriteriaType,
  sequelize } = require('../../database/models');


const getBuyerAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Counting requests
    const [counts] = await sequelize.query(`
      SELECT
        COUNT(CASE WHEN status IN ('active', 'frozen', 'closed', 'awarded') THEN 1 END) AS total_requests,
        COUNT(CASE WHEN status IN ('frozen', 'closed', 'awarded') THEN 1 END) AS finalized_requests,
        COUNT(CASE WHEN status = 'awarded' THEN 1 END) AS awarded_requests,
        COUNT(CASE WHEN status = 'frozen' THEN 1 END) AS frozen_requests
      FROM procurement_requests
      WHERE buyer_id = :userId`, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });

    // Average number of bids per request
    const totalBidsPerRequest = await ProcurementBid.count({
      include: [
        {
          model: ProcurementRequest,
          as: 'procurementRequest',
          where: {
            buyer_id: userId,
            status: ['active', 'frozen', 'closed', 'awarded'],
          },
          required: true
        },
      ],
    });

    const averageBidsPerRequest = counts.total_requests > 0 ? (totalBidsPerRequest / counts.total_requests).toFixed(2) : 0;

    // Number of awarded requests vs. total number of requests
    const awardedRatio = counts.finalized_requests > 0 ? ((counts.awarded_requests / counts.finalized_requests) * 100).toFixed(2) : 0;


    // Auction benefits
    const [benefitCalculation] = await sequelize.query(`
      SELECT 
        ROUND(100 - (AVG(pb.auction_price / pb.price) * 100)::numeric, 1) AS savings
      FROM procurement_bids pb
      
      JOIN auctions a ON pb.auction_id = a.id
      JOIN procurement_requests pr ON a.procurement_request_id = pr.id
      WHERE 
        pb.auction_placement = 1
        AND pr.buyer_id = :userId`, 
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
    });


    const auctionBenefits = benefitCalculation?.savings || 0;

    // Total number of requests per procurement_category
    const requestsPerCategory = await ProcurementCategory.findAll({
      attributes: [
        'id', 
        [sequelize.col('name'), 'category'],
        [sequelize.fn('COUNT', sequelize.col('ProcurementRequests.id')), 'count']
      ],
      include: [{
        model: ProcurementRequest,
        as: 'ProcurementRequests',
        where: { buyer_id: userId },
        attributes: [],
        required: false // ne ukjlucuj one koje nemaju bidova
      }],
      group: ['ProcurementCategory.id'],
      order: [['count', 'DESC']], 
      raw: true
    });

    // Average time to first bid
    const [timeResult] = await sequelize.query(`
      SELECT 
        AVG(
          EXTRACT(EPOCH FROM (min_bids.first_bid_time - pr.created_at)) / 3600
        )
        AS avg_hours
        FROM procurement_requests pr
      
      JOIN (
        SELECT 
          procurement_request_id, 
          MIN(submitted_at) AS first_bid_time
        FROM procurement_bids
        GROUP BY procurement_request_id
      ) min_bids ON pr.id = min_bids.procurement_request_id
      WHERE pr.buyer_id = :userId`,
      {
        replacements: { userId },
        type: sequelize.QueryTypes.SELECT
      }
    );

    const averageTimeForFirstBid = parseFloat(timeResult?.avg_hours || 0).toFixed(1);


    // Frequency of selection criteria in requests
    const criteriaFrequency = await EvaluationCriteria.findAll({
      attributes: [
        'criteria_type_id',
        [sequelize.fn('COUNT', sequelize.col('EvaluationCriteria.id')), 'count'],
        [sequelize.col('criteriaType.name'), 'criterion']
      ],
      include: [{
        model: ProcurementRequest,
        as: 'procurementRequest',
        where: { buyer_id: userId },
        attributes: [],
        required: true
      }, {
        model: CriteriaType,
        as: 'criteriaType',
        attributes: [],
        required: true
      }],
      group: ['EvaluationCriteria.criteria_type_id', 'criterion'],
      order: [[sequelize.literal('count'), 'DESC']],
      raw: true
    });

    res.status(200).json({
      totalRequests: counts.total_requests,
      avgBids: parseFloat(averageBidsPerRequest),
      awardedRatio: parseFloat(awardedRatio),
      frozenRequests: counts.frozen_requests,
      finalizedRequests: counts.finalized_requests,
      avgTime: averageTimeForFirstBid,
      auctionBenefits: auctionBenefits,
      requestPerCategory: requestsPerCategory,
      criteriaFrequency: criteriaFrequency
    });
  }

  catch (error) {
    console.error('Error fetching buyer analytics:', error);
    res.status(500).json({ message: 'Failed to fetch buyers analytics'});
  }
};

module.exports = { getBuyerAnalytics };