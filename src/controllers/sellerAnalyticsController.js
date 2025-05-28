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
    const role = req.user.role;
    const idFromQuery = req.query.id;

    let sellerId;
    if (role === 'admin' && idFromQuery) {
        sellerId= idFromQuery;
    } else {
        sellerId = req.user.id;
    };
    const contracts = await db.Contract.findAll({
        attributes: ['bid_id'],
        raw: true
    });
    const winningBids = contracts.map(contract => contract.bid_id);

    const bids = await db.ProcurementBid.findAll({
        where: {seller_id: sellerId},
        include:[
            {
            model: db.ProcurementRequest,
            as: 'procurementRequest',
            where: {status: 'awarded'},
            attributes: ['id', 'created_at', 'status']
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
        if (!bids.length) {
            return res.status(200).json([
                {name: "Probability of winning next procurement", value: 0},
                { name: "Bid Price", value: 0 },
                { name: "Price Difference From Average", value: 0 },
                { name: "Evaluation Score", value: 0 },
                { name: "Time to Bid", value: 0 },
                { name: "Number of Bid Revisions", value: 0 },
                { name: "Participation in Auctions", value: 0 },
                { name: "Final Price After Auction", value: 0 },
                { name: "Price Decrease in Auction", value: 0 },
                { name: "Bid Submission Phase", value: 0 }
            ]);
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
                const priceDiffFromAvg = bidPrice - avgPrice || 0;
                //score given by the buyer
                const evaluationScores = bid.evaluations || [];
                const evaluationScore = evaluationScores.length > 0
                    ? evaluationScores.reduce((sum, ev) => sum + (parseFloat(ev.score) || 0), 0) / evaluationScores.length : 0;
                console.log("Evaluation score: ", evaluationScore);
                //time taken to submit the bid
                const timeToBid = (new Date(bid.price_submitted_at) - new Date(bid.auction.starting_time)) / (1000 * 60) || 0; // u minutima
                console.log("Bid created at: ", bid.price_submitted_at);
                console.log("Auction starting time: ", bid.auction.starting_time);
                console.log("Time to bid: ", timeToBid);
                //auction logs
                const numBidRevisions = await db.AuctionHistory.count({where: {bid_id: bid.id}}) || 0;
                //participation in auctions
                const partcipationInAuctions = bid.auction ? 1 : 0;
                //price after auction
                const priceAfterAuction = parseFloat(bid.auction_price) || 0;
                //price decrease
                const priceDecraseInAuction = bidPrice - priceAfterAuction|| 0;
                console.log("Price after auction: ", priceDecraseInAuction);
                //avg time between bids
                let bidsHistory = await db.AuctionHistory.findAll({
                    where: {bid_id: bid.id},
                    attributes: ['created_at'],
                    order: [['created_at', 'ASC']],
                    raw: true
                });
                console.log("Bids history for bid_id =", bid.id, bidsHistory.map(b => b.created_at));
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
                console.log("Avg submission phase: ", avgSubmissionPhase);
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
                y.push([winningBids.includes(bid.id) ? 1 : 0]);
            }catch (error) {
                console.error("Error processing bid: ", error.message);
            }
        }
        console.log("X: ", x);
        console.log("Y: ", y);  

        if (x.length < 2 || y.length < 2) {
            return res.status(400).json({ message: "Not enough data to perform regression analysis." });
        }

        const lambda = 0.01; //regularization parameter
        const regression = new mlr(x, y,{intercept: false, lambda});
        const sigmoid = z => 1 / (1 + Math.exp(-z));
        let probabilities = x.map(row => {
            let z = 0;
            for (let i = 0; i < regression.weights.length; i++) {
                z += regression.weights[i][0] * row[i];
            }
            return sigmoid(z);
        });

const probability = probabilities.reduce((sum, p) => sum + p, 0) / probabilities.length;

        const maxAbsCoeff = Math.max(...regression.weights.map(w => Math.abs(w[0])) || [1]);
           const response = [
            {name: "Probability of winning next procurement",
                value: parseFloat((probability * 100).toFixed(2))
                },
            { name: "Bid Price", value: parseFloat(((regression.weights[0][0] / maxAbsCoeff) * 100).toFixed(2)) },
            { name: "Price Difference From Average", value: parseFloat(((regression.weights[1][0] / maxAbsCoeff) * 100).toFixed(2)) },
            { name: "Evaluation Score", value: parseFloat(((regression.weights[2][0] / maxAbsCoeff) * 100).toFixed(2)) },
            { name: "Time to Bid", value: parseFloat(((regression.weights[3][0] / maxAbsCoeff) * 100).toFixed(2)) },
            { name: "Number of Bid Revisions", value: parseFloat(((regression.weights[4][0] / maxAbsCoeff) * 100).toFixed(2)) },
            { name: "Participation in Auctions", value: parseFloat(((regression.weights[5][0] / maxAbsCoeff) * 100).toFixed(2)) },
            { name: "Final Price After Auction", value: parseFloat(((regression.weights[6][0] / maxAbsCoeff) * 100).toFixed(2)) },
            { name: "Price Decrease in Auction", value: parseFloat(((regression.weights[7][0] / maxAbsCoeff) * 100).toFixed(2)) },
            { name: "Bid Submission Phase", value: parseFloat(((regression.weights[8][0] / maxAbsCoeff) * 100).toFixed(2)) }
        ];
        res.status(200).json(response);
    }catch (error) {
        console.error("Error fetching seller regression: ", error.message);
        res.status(500).json({ message: error.message });
    }
}




