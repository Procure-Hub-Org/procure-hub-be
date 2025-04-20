const {
  ProcurementRequest,
  ProcurementBid,
  User,
  BidDocument,
  BidEvaluation,
  EvaluationCriteria,
  CriteriaType,
  ProcurementCategory
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
          model: ProcurementCategory,
          as: 'procurementCategory', 
          attributes: ['name']
        },
        {
          model: ProcurementBid,
          as: 'procurementBids',
          include: [
            {
              model: User,
              as: 'seller',
              attributes: ['email', 'first_name', 'last_name', 'company_name']
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
                      as: 'criteriaType',
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
        const criteria = evaluation.evaluationCriteria;
        const type = criteria?.criteriaType;

        if (criteria) {
          console.log('DEBUG CRITERIA:', criteria); // Add this log to check criteria data
          criteriaEvaluations.push({
            criteriaId: criteria.id,
            criteriaName: type?.name || 'Nema naziva kriterija',
            weight: criteria?.weight ? `${criteria.weight}%` : 'Nema težine',
            score: evaluation.score
          });
        } else {
          finalScore = evaluation.score;
        }
      });

      if (criteriaEvaluations.length === 0 && finalScore === null) {
        evaluationStatus = 'Nije evaluirano';
      } else if (criteriaEvaluations.length > 0 && finalScore === null) {
        evaluationStatus = 'Djelimično evaluirano (po kriterijima, bez ukupne ocjene)';
      } else if (criteriaEvaluations.length > 0 && finalScore !== null) {
        evaluationStatus = 'Evaluirano (po kriterijima i ukupna ocjena)';
      }

      return {
        id: bid.id,
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
      description: procurement.description,
      category: procurement.procurementCategory?.name || 'Nepoznata kategorija',
      budgetMin: procurement.budget_min,
      budgetMax: procurement.budget_max,
      location: procurement.location,
      deadline: procurement.deadline,
      bids: bids
    });

  } catch (error) {
    console.error("Greška prilikom dohvaćanja ponuda:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

async function evaluateBidCriteria(req, res) {
  try {
    const evaluations = req.body;

    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return res.status(400).json({ message: 'Request body must be a non-empty array.' });
    }

    const bidId = evaluations[0].procurement_bid_id;
    const bid = await ProcurementBid.findByPk(bidId);

    if (!bid) {
      return res.status(404).json({ message: `Bid with ID ${bidId} not found.` });
    }

    const procurement = await ProcurementRequest.findOne({
      where: {
        id: bid.procurement_request_id,
        buyer_id: req.user.id
      }
    });

    if (!procurement) {
      return res.status(403).json({ message: `Unauthorized to evaluate bid ID ${bidId}.` });
    }

    // Unos pojedinačnih ocjena
    for (const eval of evaluations) {
      const { procurement_bid_id, evaluation_criteria_id, score } = eval;

      if (!procurement_bid_id || !evaluation_criteria_id || !score) {
        return res.status(400).json({ message: 'Missing required fields in one of the evaluations.' });
      }

      if (score < 1 || score > 10 || !Number.isInteger(score)) {
        return res.status(400).json({ message: 'Score must be an integer between 1 and 10.' });
      }

      const existing = await BidEvaluation.findOne({
        where: { procurement_bid_id, evaluation_criteria_id }
      });

      if (existing) {
        return res.status(409).json({ message: `Evaluation for criteria ${evaluation_criteria_id} already exists.` });
      }

      await BidEvaluation.create({ procurement_bid_id, evaluation_criteria_id, score });
    }

    // Nakon unosa svih ocjena, provjera da li su svi kriteriji evaluirani
    const criteriaList = await EvaluationCriteria.findAll({
      where: { procurement_request_id: bid.procurement_request_id },
    });

    const allEvaluations = await BidEvaluation.findAll({
      where: {
        procurement_bid_id: bidId,
        evaluation_criteria_id: { [Op.not]: null },
      },
    });

    let finalScore = null;

    if (allEvaluations.length === criteriaList.length) {
      const weightedSum = allEvaluations.reduce((acc, evaluation) => {
        const criterion = criteriaList.find(c => c.id == evaluation.evaluation_criteria_id);
        return acc + evaluation.score * criterion.weight;
      }, 0);

      finalScore = weightedSum / 100;

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
      }
    }

    return res.status(200).json({
      message: 'All evaluations recorded successfully' +
               (finalScore !== null ? ' and final score calculated.' : '.'),
      ...(finalScore !== null && {
        final_score: finalScore,
        final_score_percent: `${(finalScore * 10).toFixed(1)}%`
      })
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
const getCriteriaByBidProposal = async (req, res) => {
  try {
    const { bidId } = req.params;

    // Pronađi sve evaluacije koje pripadaju datom bid-u i imaju kriterije
    const evaluations = await BidEvaluation.findAll({
      where: {
        procurement_bid_id: bidId,
        evaluation_criteria_id: { [Op.not]: null }
      },
      include: [
        {
          model: EvaluationCriteria,
          as: 'evaluationCriteria',
          include: [
            {
              model: CriteriaType,
              as: 'criteriaType',
              attributes: ['name']
            }
          ]
        }
      ]
    });

    const criteriaList = evaluations.map(evaluation => {
      const criteria = evaluation.evaluationCriteria;
      return {
        criteriaId: criteria.id,
        criteriaName: criteria.criteriaType?.name || 'Nepoznat kriterij',
        weight: criteria.weight,
        score: evaluation.score
      };
    });

    return res.status(200).json({
      bidId,
      criteria: criteriaList
    });
  } catch (error) {
    console.error("Greška prilikom dohvaćanja kriterija za bid:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
module.exports = {
  getBidProposals,
  evaluateBidCriteria,
  getCriteriaByBidProposal
};
