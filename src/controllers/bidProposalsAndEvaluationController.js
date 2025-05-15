const {
  ProcurementRequest,
  ProcurementBid,
  User,
  BidDocument,
  BidEvaluation,
  EvaluationCriteria,
  CriteriaType,
  ProcurementCategory,
  Auction
} = require('../../database/models');
const { Op } = require('sequelize');
const path = require('path');

const bidDocumentService = require("../services/bidDocumentService");

const getBidProposals = async (req, res) => {
  try {
    const { procurementRequestId } = req.params;
    const userId = req.user.id;

    const procurement = await ProcurementRequest.findOne({
      where: {
        id: procurementRequestId,
        status: {
  [Op.in]: ['closed', 'awarded']
},
 buyer_id: userId
      }
    });

    if (!procurement) {
      return res.status(404).json({
        message: "Procurement request not found, not closed, not awarded or does not belong to the user."
      });
    }

    let procurementCategory = null;

    if (procurement.procurement_category_id) {
      procurementCategory = await ProcurementCategory.findOne({
        where: { id: procurement.procurement_category_id },
        attributes: ['name']
      });
    }

    // Dohvati aukciju ako postoji
    const auction = await Auction.findOne({
      where: { procurement_request_id: procurement.id }
    });

    const now = new Date();
    const auctionHeld = auction ? new Date(auction.ending_time) < now : false;

    const procurementBids = await ProcurementBid.findAll({
      where: { procurement_request_id: procurement.id },
      attributes: ['id', 'seller_id', 'price', 'timeline', 'proposal_text', 'submitted_at', 'auction_price']
    });


    const bids = await Promise.all(
      procurementBids.map(async (bid) => {
        const seller = await User.findOne({
          where: { id: bid.seller_id },
          attributes: ['email', 'first_name', 'last_name', 'company_name']
        });

        /*const documents = await BidDocument.findAll({
          where: { procurement_bid_id: bid.id },
          attributes: ['id', 'original_name', 'file_path', 'file_type']
        });*/
        const documents = await bidDocumentService.getBidDocumentsByProcurementBidId(bid.id);

        const bidEvaluations = await BidEvaluation.findAll({
          where: { procurement_bid_id: bid.id }
        });

        const fullEvaluations = await Promise.all(
          bidEvaluations.map(async (evaluation) => {
            const criteria = await EvaluationCriteria.findOne({
              where: { id: evaluation.evaluation_criteria_id }
            });

            let criteriaType = null;
            if (criteria) {
              criteriaType = await CriteriaType.findOne({
                where: { id: criteria.criteria_type_id },
                attributes: ['name']
              });
            }

            return {
              ...evaluation.toJSON(),
              evaluationCriteria: criteria
                ? {
                    ...criteria.toJSON(),
                    criteriaType
                  }
                : null
            };
          })
        );

        // Procesuiranje evaluacija
        let finalScore = null;
        let criteriaEvaluations = [];
        let evaluationStatus = 'Nije evaluirano';

        fullEvaluations.forEach(evaluation => {
          const criteria = evaluation.evaluationCriteria;
          const type = criteria?.criteriaType;

          if (criteria) {
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
            email: seller?.email,
            first_name: seller?.first_name,
            last_name: seller?.last_name,
            company_name: seller?.company_name
          },
          price: bid.price,
          timeline: bid.timeline,
          proposalText: bid.proposal_text,
          submittedAt: bid.submitted_at,
          documents: documents,
          evaluations: criteriaEvaluations,
          finalScore: finalScore,
          evaluationStatus: evaluationStatus,
          auctionHeld: auctionHeld,
          bidAuctionPrice: auctionHeld ? (bid.auction_price?.toString() || bid.price?.toString()) : undefined
        };
      })
    );

    return res.status(200).json({
      procurementRequestId: procurement.id,
      isRequestAwarded: procurement.status === 'awarded',
      title: procurement.title,
      description: procurement.description,
      category: procurementCategory?.name || 'Nepoznata kategorija',
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

const getBidDocumentFile = async (req, res) => {
  try {
    const { documentId } = req.params;
    const download = req.query.download === 'true'; // Provjera da li se traži download

    const document = await BidDocument.findOne({
      where: { id: documentId }
    });

    if (!document) {
      return res.status(404).json({ message: "Dokument nije pronađen." });
    }

    // Apsolutna putanja do fajla
    const filePath = path.resolve(__dirname, '../../public/uploads', document.file_path);

    if (download) {
      // Ako korisnik želi preuzeti fajl
      return res.download(filePath, document.original_name);
    } else {
      // Inače otvori fajl u browseru
      res.type(path.extname(filePath).toLowerCase());
      return res.sendFile(filePath);
    }

  } catch (error) {
    console.error("Greška pri dohvaćanju dokumenta:", error);
    return res.status(500).json({ message: "Greška pri dohvaćanju dokumenta", error: error.message });
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
      const { procurement_request_id, procurement_bid_id, criteria_type_id, score } = eval;
      let evaluationCriteriaId_old = criteria_type_id;
    
      const evaluationCriteria = await EvaluationCriteria.findOne({
        where: { criteria_type_id: evaluationCriteriaId_old, procurement_request_id: procurement_request_id }
      });
      
      const evaluation_criteria_id = evaluationCriteria ? evaluationCriteria.dataValues.id : null;
     
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

const getEvaluationCriteriaByProcurementRequestId = async (req, res) => {
  try {
    const { id } = req.params;
    const criteria = await EvaluationCriteria.findAll({
      where: { procurement_request_id: id },
      include: [
        {
          model: CriteriaType,
          as: 'criteriaType'
        }
      ]
    });

    if (!criteria) {
      return res.status(404).json({ message: 'No evaluation criteria found for this procurement request.' });
    }

    return res.status(200).json(criteria);
  } catch (error) {
    console.error("Greška prilikom dohvaćanja kriterija:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

module.exports = {
  getBidProposals,
  evaluateBidCriteria,
  getCriteriaByBidProposal,
  getEvaluationCriteriaByProcurementRequestId,
  getBidDocumentFile
};
