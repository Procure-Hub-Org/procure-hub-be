const db = require("../../database/models");

exports.addContractDocument = async (contractId, originalName, contractPath, fileType) => {
    try {
        const [affectedRows] = await db.Contract.update(
            {
                original_name: originalName,
                contract_path: contractPath,
                file_type: fileType,
            },
            {
                where: { id: contractId }
            }
        );

        if (affectedRows === 0) {
            return null; 
        }
        const updatedContract = await db.Contract.findByPk(contractId);
        return updatedContract;
    } catch (error) {
        console.error("Error adding a contract document: ", error);
        return null;
    }
}

exports.removeContractDocument = async (contractId) => {
    try{
        const [affectedRows] = await db.Contract.update(
            {
                original_name: null,
                contract_path: null,
                file_type: null,
            },
            {
                where: { id: contractId }
            }
        );

        return affectedRows > 0;
    }
    catch (error) {
        console.error("Error removing a contract document: ", error);
        return false;
    }

}

exports.getContractDocument = async (contractId) => {
    try {
        const contract = await db.Contract.findOne({
            where: { id: contractId },
            attributes: ['id', 'original_name', 'contract_path', 'file_type']
        });

        return contract;
    } catch (error) {
        console.error("Error fetching a contract document: ", error);
        return null;
    }
}