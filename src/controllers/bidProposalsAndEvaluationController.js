const {
    ProcurementRequest,
    ProcurementBid,
    User,
    BidDocument,
    BidEvaluation,
    EvaluationCriteria,
    CriteriaType,
  } = require('../../database/models');
  
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
                    weight: crit ? crit.weight/10 : 'Nema težine'
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
  module.exports = { getBidProposals };
  