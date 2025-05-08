const generateOutbidEmailHtml = ({ user, requestTitle, auctionPrice, auctionId}) => {
    return `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
            <tr style="background-color: #1a1a1a;">
                <td style="padding: 20px; text-align: center; background-color: #fff;">
                    <img src="OVDE INSERTATI LINK SA REDISA" alt="ProcureHub" style="height: 50px;" />
                </td>
            </tr>
            <tr>
                <td style="padding: 20px;">
                <!--h2 style="margin: 0;">Procurement Request: <em>${requestTitle}</em></h2-->
                <h2 style="margin: 0; color: #124662;">ProcureHub</h2>
                <p style="margin-top: 20px;">
                    Respected <strong>${user.last_name} ${user.first_name}</strong>,
                </p>
                <p>
                    You have just been outbid for this auction.
                </p>

                <table width="100%" cellpadding="10" cellspacing="0" style="margin-top: 20px; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="background-color: #eee; color: #124662;">
                            <th>Auction</th>
                            <th>Your Last Bid</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${requestTitle}</td>
                            <td>$${auctionPrice}</td>
                        </tr>
                    </tbody>
                </table>

                <p style="margin-top: 20px;">
                    It's not too late to place another bid and get back in the lead! Click the button below:
                </p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL}/auction-monitoring/${auctionId}" 
                    style="background-color: #d9534f; color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold;">
                    Place New Bid
                    </a>
                </div>
                </td>
            </tr>
            </table>
        </body>
        </html>
    `;
};

module.exports = {
    generateOutbidEmailHtml,
};