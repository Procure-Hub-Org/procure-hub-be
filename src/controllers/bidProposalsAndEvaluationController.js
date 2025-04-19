const {
    ProcurementRequest,
    ProcurementBid,
    User,
    BidDocument,
    BidEvaluation,
    EvaluationCriteria,
    CriteriaType,
  } = require('../../database/models');
  const { Op } = require('sequelize');

  
  const getBidProposals = async (req, res) => {
    try {
      const { procurementRequestId } = req.params;
      const userId = req.user.id;
  
      const procurement = await ProcurementRequest.findOne({
        where: {
          id: procurementRequestId,
          status: 'closed',
          buyer_id: userId
        },
        include: [
          {
            model: ProcurementBid,
            as: 'procurementBids', 
            include: [
              {
                model: User,
                as: 'seller',
                attributes: ['email','first_name','last_name', 'company_name']
              },
              {
                model: BidDocument,
                as: 'documents' 
              },
              {
                model: BidEvaluation,
                as: 'evaluations', 
                include: [
                  {
                    model: EvaluationCriteria,
                    as: 'evaluationCriteria',
                    include: [
                      {
                        model: CriteriaType,
                        as: 'criteriaType' ,
                        attributes: ['name']
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      });
  
      if (!procurement) {
        return res.status(404).json({
          message: "Procurement request not found, not closed, or does not belong to the user."
        });
      }
  
      const bids = procurement.procurementBids.map(bid => {
        const evaluationsRaw = bid.evaluations || [];
        let finalScore = null;
        let criteriaEvaluations = [];
        let evaluationStatus = 'Nije evaluirano';
        evaluationsRaw.forEach(evaluation => {
            if (evaluation.evaluation_criteria_id === null) {
                // Ako je evaluation_criteria_id null, ovo je finalna ocjena cijelog tendera
                finalScore = evaluation.score;
            } else {
                // Ako nije null, ovo je ocjena za specifičan kriterij
                const crit = evaluation.evaluationCriteria;
                console.log(JSON.stringify(evaluation, null, 2))
                criteriaEvaluations.push({
                criteria: crit?.dataValues.CriteriaType?.name || 'Nema naziva kriterija',
                    score: evaluation.score,
                    weight: crit ? `${crit.weight}%`: 'Nema težine'
                });
            }
        });
    
        // Provjera statusa evaluacije
        if (criteriaEvaluations.length === 0 && finalScore === null) {
            evaluationStatus = 'Nije evaluirano';
        } else if (criteriaEvaluations.length > 0 && finalScore === null) {
            evaluationStatus = 'Djelimično evaluirano (po kriterijima, bez ukupne ocjene)';
        } else if (criteriaEvaluations.length > 0 && finalScore !== null) {
            evaluationStatus = 'Evaluirano (po kriterijima i ukupna ocjena)';
        }
    
        return {
            seller: {
                email: bid.seller?.email,
                first_name: bid.seller?.first_name,
                last_name: bid.seller?.last_name,
                company_name: bid.seller?.company_name
            },
            price: bid.price,
            timeline: bid.timeline,
            proposalText: bid.proposal_text,
            submittedAt: bid.submitted_at,
            documents: (bid.documents || []).map(doc => ({
                original_name: doc.original_name,
                file_path: doc.file_path
            })),
            evaluations: criteriaEvaluations,
            finalScore: finalScore,
            evaluationStatus: evaluationStatus
        };
    });
    
    return res.status(200).json({
        procurementRequestId: procurement.id,
        title: procurement.title,
        bids: bids
    });
    
    } catch (error) {
      console.error("Greška prilikom dohvaćanja ponuda:", error);
      return res.status(500).json({ message: "Internal server error", error: error.message });
    }
  };
  async function evaluateBidCriteria(req, res) {
    try {
      const { procurement_bid_id, evaluation_criteria_id, score } = req.body;
  
      if (!procurement_bid_id || !evaluation_criteria_id || !score) {
        return res.status(400).json({ message: 'Missing required fields.' });
      }
  
      if (score < 1 || score > 10 || !Number.isInteger(score)) {
        return res.status(400).json({ message: 'Score must be an integer between 1 and 10.' });
      }
  
      const bid = await ProcurementBid.findByPk(procurement_bid_id);
      if (!bid) {
        return res.status(404).json({ message: 'Bid not found.' });
      }
  
      const procurement = await ProcurementRequest.findOne({
        where: {
          id: bid.procurement_request_id,
          buyer_id: req.user.id
        }
      });
  
      if (!procurement) {
        return res.status(403).json({ message: "You are not authorized to evaluate this bid." });
      }
  
      const existing = await BidEvaluation.findOne({
        where: { procurement_bid_id, evaluation_criteria_id }
      });
  
      if (existing) {
        return res.status(409).json({ message: 'Evaluation for this criteria already exists.' });
      }
  
      await BidEvaluation.create({ procurement_bid_id, evaluation_criteria_id, score });
  
      return res.status(200).json({ message: 'Evaluation recorded successfully.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  }
  const evaluateFinalScore = async (req, res) => {
    const { bidId } = req.params;
  
    try {
      const bid = await ProcurementBid.findByPk(bidId);
      if (!bid) return res.status(404).json({ error: 'Bid not found' });
  
      const criteriaList = await EvaluationCriteria.findAll({
        where: { procurement_request_id: bid.procurement_request_id },
      });
  
      const evaluations = await BidEvaluation.findAll({
        where: {
          procurement_bid_id: bidId,
          evaluation_criteria_id: { [Op.not]: null },
        },
      });
  
      if (evaluations.length === criteriaList.length) {
        const weightedSum = evaluations.reduce((acc, evaluation) => {
          const criterion = criteriaList.find(c => c.id == evaluation.evaluation_criteria_id);
          return acc + evaluation.score * criterion.weight;
        }, 0);
  
        const finalScore = weightedSum / 100; 
  
        const existingAverage = await BidEvaluation.findOne({
          where: {
            procurement_bid_id: bidId,
            evaluation_criteria_id: null,
          },
        });
  
        if (!existingAverage) {
          await BidEvaluation.create({
            procurement_bid_id: bidId,
            evaluation_criteria_id: null,
            score: finalScore,
          });
  
          return res.status(200).json({ message: 'Final evaluation score calculated and saved.', score: finalScore });
        } else {
          return res.status(200).json({ message: 'Final evaluation already exists.', score: existingAverage.score });
        }
      } else {
        return res.status(400).json({ message: 'Not all criteria have been evaluated yet.' });
      }
    } catch (err) {
      console.error("Error during final evaluation:", err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  module.exports = {
    getBidProposals,
    evaluateBidCriteria,
    evaluateFinalScore
  };
  