const { getSellerAnalytics } = require('../services/analyticsSellerService.js');
const { Op } = require('sequelize');
const db = require("../../database/models");
const mlr =require('ml-regression-multivariate-linear');
const { raw } = require('express');


exports.getAllSellerAnalytics = async (req, res) => {
    try {
        const role = req.user.role;
        const idFromQuery = req.query.id;

        let sellerId;
        if (role === 'admin' && idFromQuery) {
        sellerId= idFromQuery;
        } else {
        sellerId = req.user.id;
        }
        // if (!req.user || !req.user.id) {
        //     return res.status(401).json({ message: "Unauthorized" });
        // }
        // const sellerId = req.user.id;
        const analytics = await getSellerAnalytics(sellerId);
        res.status(200).json(analytics);
    } catch (error) {
        console.error("Error fetching seller analytics: ", error.message);
        res.status(500).json({ message: error.message });
    }
}
exports.getSellerRegression = async (req, res) => {
try{
    const sellerId = req.user.id;
    const bids = await db.ProcurementBid.findAll({
        where: {seller_id: sellerId},
        include:[
            {
            model: db.ProcurementRequest,
            as: 'procurementRequest',
            attributes: ['id', 'created_at']
            },
            {
            model: db.Auction,
            as: 'auction',
            attributes: ['starting_time', 'ending_time']
            },{
            model: db.BidEvaluation,
            as: 'evaluations',
            attributes: ['id', 'score'] 
            }
        ]
        });
        if(!bids.length) {
            return res.status(404).json({ message: "No bids found for this seller." });
        }

        //group bids by auction_id
        const bids_by_auction = {};
        bids.forEach(bid => {
            if(!bids_by_auction[bid.auction_id]) {
                bids_by_auction[bid.auction_id] = [];
            }
             bids_by_auction[bid.auction_id].push(bid);
        });
        let x = [];
        let y = [];

        for(const bid of bids) {
            try{
                //submitted price
                const bidPrice = parseFloat(bid.price) || 0;
                //avg price - seller's price
                const auctionBids = bids_by_auction[bid.auction_id] || [];
                const avgPrice = auctionBids.reduce((sum, b) => sum + (parseFloat(b.price) || 0), 0) / auctionBids.length;
                const priceDiffFromAvg = bidPrice - avgPrice;
                //score given by the buyer
                const evaluationScores = bid.evaluations || [];
                const evaluationScore = evaluationScores.length > 0
                    ? evaluationScores.reduce((sum, ev) => sum + (parseFloat(ev.score) || 0), 0) / evaluationScores.length
                    : 0;
                //console.log("Evaluation score: ", evaluationScore);
                //time taken to submit the bid
                const timeToBid = (new Date(bid.price_submitted_at) - new Date(bid.auction.starting_time)) / (1000 * 60) || 0; // u minutima
                //console.log("Bid created at: ", bid.price_submitted_at);
                //console.log("Auction starting time: ", bid.auction.starting_time);
                //console.log("Time to bid: ", timeToBid);
                //auction logs
                const numBidRevisions = await db.AuctionHistory.count({where: {bid_id: bid.id}}) || 0;
                //participation in auctions
                const partcipationInAuctions = bid.auction ? 1 : 0;
                //price after auction
                const priceAfterAuction = parseFloat(bid.auction_price) || 0;
                //price decrease
                const priceDecraseInAuction = priceAfterAuction - bidPrice;
                //console.log("Price after auction: ", priceDecraseInAuction);
                //avg time between bids
                let bidsHistory = await db.AuctionHistory.findAll({
                    where: {bid_id: bid.id},
                    attributes: ['created_at'],
                    order: [['created_at', 'ASC']],
                    raw: true
                });
                //console.log("Bids history for bid_id =", bid.id, bidsHistory.map(b => b.created_at));
                let avgTime = 0;
                if(bidsHistory.length > 1) {
                    let totalTime = 0;
                    for(let i = 1; i < bidsHistory.length; i++) { 
                        totalTime += (new Date(bidsHistory[i].created_at) - new Date(bidsHistory[i-1].created_at)); 
                        console.log("Time between bids: ", totalTime);
                    }
                    avgTime = totalTime / (bidsHistory.length - 1);
                    console.log("Avg time between bids: ", avgTime);
                }
                const avgSubmissionPhase = avgTime/ (1000 * 60) || 0; // u minutima
                //console.log("Avg submission phase: ", avgSubmissionPhase);
                x.push([
                    bidPrice,
                    priceDiffFromAvg,
                    evaluationScore,
                    timeToBid,
                    numBidRevisions,
                    partcipationInAuctions,
                    priceAfterAuction,
                    priceDecraseInAuction,
                    avgSubmissionPhase
                ]);
                //winner or not 
                y.push([bid.auction_placement === 1 ? 1 : 0]);
            }catch (error) {
                console.error("Error processing bid: ", error.message);
            }
        }
        //console.log("X: ", x);
        //console.log("Y: ", y);  

        if (x.length < 2 || y.length < 2) {
            return res.status(400).json({ message: "Not enough data to perform regression analysis." });
        }

        const lambda = 0.01; //regularization parameter
        const regression = new mlr(x, y,{intercept: false, lambda});
         
        const lastRow = x[x.length - 1];
        let z = 0;

        for(let i = 0; i < regression.weights.length; i++) {
            z+= regression.weights[i] * lastRow[i];
        }   
        const probabily = 1 / (1 + Math.exp(-z));
        res.status(200).json({
            probability_of_winning_next_procurement: probabily.toFixed(5) * 100, //convert to percentage
            coefficients:{
                bid_price: regression.weights[0],
                price_diff_from_avg: regression.weights[1],
                evaluation_score: regression.weights[2],
                time_to_bid: regression.weights[3],
                num_bid_revisions: regression.weights[4],
                participation_in_auctions: regression.weights[5],
                final_price_after_auction: regression.weights[6],
                price_decrease_in_auction: regression.weights[7],
                bid_submission_phase: regression.weights[8]
            }
        });
    }catch (error) {
        console.error("Error fetching seller regression: ", error.message);
        res.status(500).json({ message: error.message });
    }
}
