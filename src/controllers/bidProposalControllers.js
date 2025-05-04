const {ProcurementBid, User, ProcurementRequest, AdminLog} = require('../../database/models');


exports.createBid = async (req, res) => {
    try {
        const { procurement_request_id, price, timeline, proposal_text, submitted } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user || user.role !== 'seller') {
          return res.status(403).json({ message: 'You do not have the required role to create a procurement request' });
        }
        if(user.status !== 'active') {
          return res.status(403).json({ message: 'Your account is not active. Please contact support.' });
        }


        
        // Validate the request body
        if (!procurement_request_id || !price || !timeline || !proposal_text) {
            return res.status(400).json({ message: 'All fields are required.'});
        }

        // Check if the procurement requesr exists, its deadline hasn't passed, and its status is active
        const request = await ProcurementRequest.findByPk(procurement_request_id);
        if (!request) {
            return res.status(400).json({ message: 'Procurement request not found' });
        }
        if (request.status !== 'active') {
            return res.status(400).json({ message: 'Procurement request is not active.' });
        }


        // Check if price has positive value
        if (price < 0) {
            return res.status(400).json({ message: 'Price cannot be negative.'});
        }

        currentDate = new Date();
        
        // Create the bid
        const bid = await ProcurementBid.create({
            seller_id: user.id,
            procurement_request_id,
            price,
            timeline,
            proposal_text,
            submitted_at: currentDate,
            submitted_at: submitted ? new Date() : null,
            auction_price: price,
        });

        // Creates admin log for created bid
        const adminLog = await AdminLog.create({
            procurement_bid_id: bid.id,
            user_id: user.id,
            action: submitted ? 'submit' : 'draft',
        });

        if (!adminLog) {
            return res.status(500).json({ message: 'Failed to create admin log' });
        }

        return res.status(200).json({ message: 'Bid created successfully', bid });

    } catch (error) {
        console.error('Error while creating bid:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
}


exports.updateDraftBid = async (req, res) => {
    try {
      const { id } = req.params;
      const { price, timeline, proposal_text } = req.body;
  
      // Check if the bid exists
      const bid = await ProcurementBid.findByPk(id);
      if (!bid) {
        return res.status(404).json({ message: 'Bid not found' });
      }
  
      if (bid.submitted_at) {
        return res.status(400).json({ message: 'Bid has already been submitted and cannot be updated' });
      }
  
      // Check if the user is the seller of the bid
      if (!req.user || bid.seller_id !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to update this bid' });
      }
      if(req.user.status !== 'active') {
        return res.status(403).json({ message: 'Your account is not active. Please contact support.' });
      }
  
      const request = await ProcurementRequest.findByPk(bid.procurement_request_id);
      if (!request) {
        return res.status(400).json({ message: 'Procurement request not found' });
      }

      if (request.status !== 'active') {
        return res.status(400).json({ message: 'Procurement request is not active.' });
      }
      // Build an object with only the fields that are present
      const updatedFields = {};
      if (price !== undefined){
        // Check if the price has valid value
        if (!request) {
            return res.status(400).json({ message: 'Procurement request not found' });
        }
        if (price < 0) {
            return res.status(400).json({ message: 'Price cannot be negative.'});
        }
        updatedFields.price = price;
      } 
      if (timeline !== undefined) updatedFields.timeline = timeline;
      if (proposal_text !== undefined) updatedFields.proposal_text = proposal_text;
  
      // If no fields were provided
      if (Object.keys(updatedFields).length === 0) {
        return res.status(400).json({ message: 'No valid fields provided to update.' });
      }
  
      // Update the bid with the provided fields
      await bid.update(updatedFields);

      // Creates admin log for created bid
      const adminLog = await AdminLog.create({
          procurement_bid_id: bid.id,
          user_id: req.user.id,
          action: 'update',
      });

      if (!adminLog) {
          return res.status(500).json({ message: 'Failed to create admin log' });
      }
  
      return res.status(200).json({ message: 'Bid updated successfully', bid });
  
    } catch (error) {
      console.error('Error updating draft bid:', error);
      return res.status(500).json({ message: 'An error occurred while updating the draft bid.' });
    }
  };
  

exports.submitDraftBid = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if the bid exists
        const bid = await ProcurementBid.findByPk(id);
        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Check if the user is the seller of the bid
        if (!req.user || req.user.id !== bid.seller_id) {
            return res.status(403).json({ message: 'You do not have the required role to submit this bid' });
        }
        if(req.user.status !== 'active') {
          return res.status(403).json({ message: 'Your account is not active. Please contact support.' });
        }

        const request = await ProcurementRequest.findByPk(bid.procurement_request_id);
        if (!request) {
            return res.status(400).json({ message: 'Procurement request not found' });
        }
        if(request.deadline < new Date()){
          return res.status(400).json({ message: 'Procurement request deadline has passed!' });
        }
        if (request.status !== 'active') {
          return res.status(400).json({ message: 'Procurement request is not active.' });
        }

        // Check if the bid is already submitted
        if (bid.submitted_at) {
            return res.status(400).json({ message: 'Bid has already been submitted' });
        }

        // Update the bid to mark it as submitted
        await bid.update({
            submitted_at: new Date(),
        });

        // Creates admin log for created bid
        const adminLog = await AdminLog.create({
            procurement_bid_id: bid.id,
            user_id: req.user.id,
            action: 'submit',
        });

        if (!adminLog) {
            return res.status(500).json({ message: 'Failed to create admin log' });
        }

        return res.status(200).json({ message: 'Bid submitted successfully', bid });

    } catch (error) {
        console.error('Error submitting bid:', error);
        return res.status(500).json({ message: 'An error occurred while submitting the bid.' });
    }
}

exports.previewBid = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if the bid exists
        const bid = await ProcurementBid.findByPk(id);
        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Check if the user is the seller of the bid
        if (!req.user || req.user.id !== bid.seller_id) {
            return res.status(403).json({ message: 'You do not have the required role to preview this bid' });
        }
        if(req.user.status !== 'active') {
          return res.status(403).json({ message: 'Your account is not active. Please contact support.' });
        }

        return res.status(200).json({ message: 'Bid preview', bid });

    } catch (error) {
        console.error('Error previewing bid:', error);
        return res.status(500).json({ message: 'An error occurred while previewing the bid.' });
    }
}

