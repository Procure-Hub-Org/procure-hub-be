const {
  Auction,
  ProcurementBid,
  ProcurementRequest,
  ProcurementCategory,
  EvaluationCriteria,
  CriteriaType,
  sequelize } = require('../../database/models');
const MVLinearRegression = require('ml-regression-multivariate-linear');
const { Op } = require('sequelize');

const getBuyerAnalytics = async (req, res) => {
  try {

    const role = req.user.role;
    const idFromQuery = req.query.id;

    let userId;
    if (role === 'admin' && idFromQuery) {
      userId = idFromQuery;
    } else {
      userId = req.user.id;
    }
    // const userId = req.user.id;

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
        ROUND(100 - (AVG(winner_ratio) * 100)::numeric, 1) AS savings
      FROM (
        SELECT 
          pb.auction_price::numeric / pb.price AS winner_ratio
        FROM procurement_bids pb
        
        JOIN auctions a ON pb.auction_id = a.id
        JOIN procurement_requests pr ON a.procurement_request_id = pr.id
        WHERE 
          pb.auction_placement = 1
          AND pr.buyer_id = :userId
      ) AS per_auction`,
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
    res.status(500).json({ message: 'Failed to fetch buyers analytics' });
  }
};


const getRegressionData = async (req, res) => {

  userId = req.query.id;
  if (!userId) {
    return res.status(400).json({ message: 'Missing user ID' });
  }

  try {

    // Dobavi sve tendere sa zavrsenim aukcijama vezane za buyer
    const procurementRequests = await ProcurementRequest.findAll({
      where: {
        status: { [Op.in]: ['awarded', 'closed'] },
        buyer_id: userId,
      },
      include: [
        {
          model: EvaluationCriteria,
          as: 'evaluationCriteria',
          required: false
        }
      ]
    });

    // Buyer nema zavrsenih tendera
    if (procurementRequests.length === 0) {
      return res.status(404).json({ message: 'No completed procurement requests' });
    }

    const procurementRequestsIds = procurementRequests.map(req => req.id);
    // Ponude vezane za tender
    const bids = await ProcurementBid.findAll({
      where: {
        procurement_request_id: {
          [Op.in]: procurementRequestsIds
        }
      },
    });

    // Ako nema nikakvih pounuda na tenderima
    // vrati prazan odgovor
    if (bids.length === 0) {
      return res.status(200).json([
        { name: "Auction Duration", value: 0 },
        { name: "Last Call Duration", value: 0 },
        { name: "Number of Bidders", value: 0 },
        { name: "Time Until Last Bid", value: 0 },
        { name: "Total Number of Bids", value: 0 },
        { name: "Evaluation Weight Entropy", value: 0 },
        { name: "Has Must-Have Criteria", value: 0 },
        { name: "Strictness of Criteria", value: 0 },
        { name: "Price Decrease in Auction", value: 0 },
        { name: "Extended Duration", value: 0 }
      ]);
    }

    // Aukcije vezane za tender
    const auctions = await Auction.findAll({
      where: {
        procurement_request_id: {
          [Op.in]: procurementRequestsIds
        }
      }
    });

    // Grupiranje aukcija i pounuda vezane za tender
    const auctionsByRequestId = {};
    auctions.forEach(auction => {
      auctionsByRequestId[auction.procurement_request_id] = auction;
    });

    const bidsByRequestId = {};
    bids.forEach(bid => {
      if (!bidsByRequestId[bid.procurement_request_id]) {
        bidsByRequestId[bid.procurement_request_id] = [];
      }
      bidsByRequestId[bid.procurement_request_id].push(bid);
    });

    const data = procurementRequests.map(request => ({
      auction: auctionsByRequestId[request.id] || null,
      procurementBids: bidsByRequestId[request.id] || [],
      evaluationCriteria: request.evaluationCriteria || [],
      created_at: request.created_at
    })).filter(d => d.procurementBids.length > 0);

    const variables = [
      { key: 'auction_duration', name: 'Auction Duration' },
      { key: 'last_call_duration', name: 'Last Call Duration' },
      { key: 'num_bidders', name: 'Number of Bidders' },
      { key: 'time_until_first_bid', name: 'Time Until Last Bid' },
      { key: 'num_total_bids', name: 'Total Number of Bids' },
      { key: 'evaluation_weight_entropy', name: 'Evaluation Weight Entropy' },
      { key: 'has_must_have_criteria', name: 'Has Must-Have Criteria' },
      { key: 'strictness_of_criteria', name: 'Strictness of Criteria' },
      { key: 'price_decrease_in_auction', name: 'Price Decrease in Auction' },
      { key: 'extended_duration', name: 'Extended Duration' }
    ];
    const X = []; // nezavisne varijable
    const y = []; // zavisne varijable

    // Priprema podataka za regresiju
    for (const d of data) {
      const auction = d.auction;
      const bids = d.procurementBids;
      const evaluationCriteria = d.evaluationCriteria;

      // Varijable
      const auctionDuration = auction ? auction.duration : 0;
      const lastCallDuration = auction ? auction.last_call_timer : 0;
      const numTotalBids = bids.length;

      // Izdvajamo id sellera za bidove i uklanjamo duplikate 
      const numBidders = new Set(bids.map(bid => bid.seller_id)).size;

      // Vrijeme potrebno za prvi bid (u minutama)
      const firstBid = bids.reduce((first, bid) =>
        bid.submitted_at < first.submitted_at ? bid : first, bids[0]);
      timeUntilFirstBid = (firstBid.submitted_at - d.created_at) / (1000 * 60);


      // Entropija za criteria evaluation
      const totalWeight = evaluationCriteria.reduce((sum, criteria) => sum + criteria.weight, 0);
      const weights = evaluationCriteria.map(criteria => criteria.weight / totalWeight); // normalizacija
      const evaluationWeightEntropy = weights.reduce((sum, w) => {
        return sum - (w > 0 ? w * Math.log(w) : 0);
      }, 0);

      const hasMustHaveCriteria = evaluationCriteria.some(criteria => criteria.is_must_have);
      const strictnessOfCriteria = evaluationCriteria.filter(criteria => criteria.is_must_have).length;

      // Smanjenje cijene ponude
      let lowestFinalPrice = 0;
      let priceDecreaseInAuction = 0;
      let extendedDuration = 0; //samo ako ima aukcija

      const auctionIsFinished = auction && auction.ending_time && new Date(auction.ending_time) <= new Date();
      // Racuna price decrease in auction samo ako ima aukciju
      if (auctionIsFinished) {
        const winningBid = bids.find(bid => bid.auction_placement === 1);
        lowestFinalPrice = winningBid.auction_price;
        priceDecreaseInAuction = winningBid.price - winningBid.auction_price;
        extendedDuration = auction.ending_time - auction.starting_time - auction.duration;
      }
      else {
        const lowestBid = bids.reduce((min, bid) => bid.price < min.price ? bid : min, bids[0]);
        lowestFinalPrice = lowestBid.price;
      }

      // Dodavanje u podatke za regresiju
      X.push([
        auctionDuration,
        lastCallDuration,
        numBidders,
        timeUntilFirstBid,
        numTotalBids,
        evaluationWeightEntropy,
        hasMustHaveCriteria ? 1 : 0,
        strictnessOfCriteria,
        priceDecreaseInAuction,
        extendedDuration
      ]);

      y.push([lowestFinalPrice]);
    }

    // Regresija racun
    const regression = new MVLinearRegression(X, y);


    // Najveći apsolutni koeficijent (za skaliranje u procente)
    const maxAbsCoeff = Math.max(...regression.weights.map(w => Math.abs(w[0])) || [1]);

    // Formiranje odgovora (pretvaranje koef. u procenete)
    const response = variables.map((variable, index) => ({
      name: variable.name,
      //value: Math.round((Math.abs(regression.weights[index][0]) / maxAbsCoeff) * 100) //koeficijenti mogu biti negativni
      value: Math.round((regression.weights[index][0] / maxAbsCoeff) * 100)
    }));

    return res.status(200).json(response);
  }
  catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error during regression analysis' });
  }
};

module.exports = {
  getBuyerAnalytics,
  getRegressionData,
};