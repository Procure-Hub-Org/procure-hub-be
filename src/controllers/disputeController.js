const {
    Dispute,
    Contract,
    ProcurementRequest,
    ProcurementBid,
    User } = require('../../database/models');


const getDisputesOfContract = async (req, res) => {
    const { contractId } = req.params;
    const user = req.user;

    try {
        // contract sa datim id
        const contract = await Contract.findByPk(contractId, {
            include: [
                {
                    model: ProcurementRequest,
                    as: 'procurementRequest',
                    attributes: ['buyer_id'],
                },
                {
                    model: ProcurementBid,
                    as: 'bid',
                    attributes: ['seller_id'],
                }
            ]
        });

        // ako ne postoji contract sa datim id
        if (!contract) { return res.status(404).json({ message: 'Contract not found' }) }

        const buyerId = contract.procurementRequest.buyer_id;
        const sellerId = contract.bid.seller_id;

        // formiranje filtera za diputes prema rolama
        let filterDispute = {
            contract_id: contractId
        };

        if (user.role !== 'admin') {

            // buyer vidi dispute koje je seller napravio
            if (user.id === buyerId) {
                filterDispute.user_id = sellerId;
            }
            // seller vidi dispute koje je buyer napravio
            else if (user.id === sellerId) {
                filterDispute.user_id = buyerId;
            }
            else {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        // dobavljanje disputes
        const disputes = await Dispute.findAll({
            where: filterDispute,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['name', 'company_name']
                }
            ]
        });

        // forimarnje odgovora
        const response = disputes.map(d => ({
            buyer_name: d.user.id === buyerId ? d.user.name : null,
            buyer_company_name: d.user.id === buyerId ? d.user.company_name : null,
            seller_name: d.user.id === sellerId ? d.user.name : null,
            seller_company_name: d.user.id === sellerId ? d.user.company_name : null,
            complainment_text: d.complainment_text
        }));

        return res.json(response);

    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
  getDisputesOfContract,
};
