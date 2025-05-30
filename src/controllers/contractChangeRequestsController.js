const { ContractChangeRequest } = require('../../database/models/');

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

module.exports = {
    getContractChangeRequests
};