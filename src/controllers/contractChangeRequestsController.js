const { ContractChangeRequest, Notification, ContractLog, ProcurementRequest, User, Contract } = require('../../database/models/index.js');
const { sendMail } = require('../services/mailService.js');
const { generateChangeRequestEmailHtml } = require('../utils/templates/emailTemplates.js');

const path = require('path');

const getContractChangeRequests = async (req, res) => {
    try {
        const contractId = req.params.contractId;
        const changeRequests = await ContractChangeRequest.findAll({
            where: { contract_id: contractId },
            attributes: ['message', 'created_at'],
        });
    
        if (!changeRequests || changeRequests.length === 0) {
            return res.status(404).json({ message: 'No change requests found for this contract.' });
        }

        

        res.status(200).json(changeRequests);
    } catch (error) {
        console.error("Error fetching contract change requests: ", error.message);
        res.status(500).json({ message: error.message });
    }
}

const postContractChangeRequest = async (req, res) => {
    try {
        const contractId = req.params.contractId;
        console.log("Contract ID: ", contractId);
        const { sellerId, message } = req.body;
        console.log("Seller ID: ", sellerId);
        console.log("Message: ", message);
        if (!contractId || !sellerId || !message) {
            return res.status(400).json({ message: 'Contract ID, seller ID, and message are required.' });
        }

        if(req.user.role !== 'seller') {
            return res.status(403).json({ message: 'Only sellers can post change requests.'});
        }

        const newChangeRequest = await ContractChangeRequest.create({
            contract_id: contractId,
            seller_id: sellerId,
            message: message,
        });

        const contract = await Contract.findOne({
            include: [{
                model: ProcurementRequest, 
                as: 'procurementRequest',
                attributes: ['buyer_id', 'title']
            }],
            where: { id: contractId },
            attributes: []
        });

        const buyerId = contract?.procurementRequest?.buyer_id;


        const buyer = await User.findByPk(buyerId);

        const seller = await User.findByPk(sellerId);

        const newNotification = await Notification.create({
            contract_id: contractId,
            user_id: buyerId,
            text: `New change request from seller ${seller.first_name} ${seller.last_name} for contract related to procurement request \"${contract.procurementRequest.title}\": ${message}`,
        });

        const admins = await User.findAll({
            where: { role: 'admin'}
        });
        for (const admin of admins) {
            await Notification.create({
                contract_id: contractId,
                user_id: admin.id,
                text: `New change request from seller ${seller.first_name} ${seller.last_name} for contract related to procurement request \"${contract.procurementRequest.title}\": ${message}`,
            })
        }

        const contractLog = await ContractLog.create({
            contract_id: contractId,
            action: `Requested changes for contract \"${message}\"`,
            user_id: sellerId,
        });

        const htmlContent = generateChangeRequestEmailHtml({
            buyer: buyer,
            seller: seller,
            contractId: contractId,
            procurementRequestTitle: contract.procurementRequest.title,
            message: message,
            logoCid: 'logoImage'
        })

        await sendMail({
            to: buyer.email,
            subject: `New Change Request for Contract related to procurement request \"${contract.procurementRequest.title}\"`,
            text: `Respected ${buyer.first_name} ${buyer.last_name}, \nA new change request has been made by seller ${seller.first_name} ${seller.last_name} for contract related to procurement request \"${contract.procurementRequest.title}\". \nMessage: ${message}`,
            html: htmlContent,
            attachments: [
                            {
                                filename: 'logo.png',
                                path: path.join(__dirname, '../../public/logo/logo-no-background.png'), 
                                cid: 'logoImage', 
                                contentDisposition: 'inline', 
                            }
                        ],
        });

        res.status(201).json({
            message: 'Change request created succesfully.',
            changeRequest: newChangeRequest,
            buyer_notification: newNotification,
            admin_notifications: admins.map(admin => ({
                user_id: admin.id,
                text: `New change request from seller ${sellerId} for contract ${contractId}: ${message}`
            })),
            contractLog: contractLog
        });

    }
    catch (error) {
        res.status(500).json({ message: error.message});
    }
}

module.exports = {
    getContractChangeRequests,
    postContractChangeRequest
};