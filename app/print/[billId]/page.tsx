'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PrintPage({ 
  params 
}: { 
  params: { billId: string } 
}) {
  const [bill, setBill] = useState<any>(null)

  useEffect(() => {
    const fetchAndPrint = async () => {
      const { data } = await supabase
        .from('bills')
        .select('*')
        .eq('id', params.billId)
        .single()
      
      if (data) {
        setBill(data)
        setTimeout(() => {
          window.print()
        }, 500)
      }
    }
    fetchAndPrint()
  }, [params.billId])

  if (!bill) return (
    <div>Loading...</div>
  )

  const items = bill.items || []
  const ITEMS_PER_PAGE = 5
  const pages = []
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE))
  }
  if (pages.length === 0) {
    pages.push([])
  }

  return (
    <>
      <style>{`
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 11px;
          background: white;
        }
        @media print {
          @page { size: 148mm 210mm; margin: 0; } /* Strict A5 Portrait */
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .bill-page { 
          width: 148mm;
          height: 210mm;
          overflow: hidden;
          page-break-after: always;
          padding: 8mm;
          background: white;
          position: relative;
        }
        .bill-page:last-child { 
          page-break-after: avoid; 
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
        }
        th, td { 
          border: 1px solid #000; 
          padding: 3px 4px; 
          font-size: 10px; 
        }
        th { 
          background: #000; 
          color: #fff; 
          text-align: center; 
        }
        .text-right { 
          text-align: right; 
        }
        .text-center { 
          text-align: center; 
        }
        .bold { 
          font-weight: bold; 
        }
        .grand-total {
          font-size: 13px;
          font-weight: 900;
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          padding: 4px 0;
          margin: 3px 0;
          display: flex;
          justify-content: space-between;
        }
        @media screen {
          body { 
            padding: 20px; 
            background: #f0f0f0;
          }
          .bill-page { 
            margin-bottom: 20px;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>

      {pages.map((pageItems, idx) => (
        <div key={idx} className="bill-page mx-auto">
          {/* HEADER */}
          <div style={{ textAlign:'center', borderBottom:'2px solid #000', paddingBottom:'6px', marginBottom:'6px' }}>
            <div style={{ fontSize:'18px', fontWeight:'900', letterSpacing:'1px' }}>
              HANUMAN PAINTS
            </div>
            <div>Authorized Dulux Blue Store</div>
            <div>Ward No 16, Lohapatty, Madhubani</div>
            <div>Ph: 8292889540</div>
          </div>

          {/* BILL INFO */}
          <div style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px solid #000', padding:'3px 0', marginBottom:'4px' }}>
            <span>Bill No: <strong>{bill.bill_number}</strong></span>
            <span>Date: <strong>{new Date(bill.created_at).toLocaleDateString('en-IN')}</strong></span>
          </div>

          {/* CUSTOMER */}
          <div style={{ borderBottom:'1px solid #000', padding:'3px 0', marginBottom:'6px' }}>
            <div>Customer: <strong>{bill.customer_name}</strong></div>
            <div>Phone: {bill.customer_phone}</div>
            {bill.customer_address && (
              <div>{bill.customer_address}</div>
            )}
          </div>

          {/* ITEMS TABLE */}
          <table style={{ marginBottom:'6px' }}>
            <thead>
              <tr>
                <th style={{width:'8%'}}>S.No</th>
                <th style={{width:'36%', textAlign:'left'}}>Item</th>
                <th style={{width:'12%'}}>Size</th>
                <th style={{width:'8%'}}>Qty</th>
                <th style={{width:'18%'}}>Rate</th>
                <th style={{width:'18%'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item: any, i: number) => (
                <div key={i} style={{ display: "contents" }}>
                  <tr>
                    <td className="text-center">{idx * ITEMS_PER_PAGE + i + 1}</td>
                    <td>{item.name}</td>
                    <td className="text-center">{item.size}</td>
                    <td className="text-center">{item.qty}</td>
                    <td className="text-right">₹{Number(item.price).toFixed(2)}</td>
                    <td className="text-right">₹{Number(item.item_total).toFixed(2)}</td>
                  </tr>
                  {item.hasColorant && (
                    <tr>
                      <td></td>
                      <td colSpan={5} style={{ fontSize:'9px', color:'#555' }}>
                        └ Color: {item.colorCode} {item.baseInput && ` | Base: ${item.baseInput}`} | Colorant: ₹{item.colorantCost}
                      </td>
                    </tr>
                  )}
                </div>
              ))}
            </tbody>
          </table>

          {/* TOTALS - last page only */}
          {idx === pages.length - 1 ? (
            <div style={{ borderTop:'2px solid #000', paddingTop:'6px' }}>
              <div style={{display:'flex', justifyContent:'space-between', padding:'2px 0'}}>
                <span>Subtotal:</span>
                <span>₹{Number(bill.subtotal).toFixed(2)}</span>
              </div>
              {Number(bill.discount_amount) > 0 && (
                <div style={{display:'flex', justifyContent:'space-between', padding:'2px 0'}}>
                  <span>Discount:</span>
                  <span>-₹{Number(bill.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div style={{display:'flex', justifyContent:'space-between', padding:'2px 0'}}>
                <span>Taxable:</span>
                <span>₹{Number(bill.taxable_value).toFixed(2)}</span>
              </div>
              {Number(bill.cgst_amount) > 0 && (
                <>
                  <div style={{display:'flex', justifyContent:'space-between', padding:'2px 0'}}>
                    <span>CGST:</span>
                    <span>+₹{Number(bill.cgst_amount).toFixed(2)}</span>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', padding:'2px 0'}}>
                    <span>SGST:</span>
                    <span>+₹{Number(bill.sgst_amount).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="grand-total">
                <span>GRAND TOTAL:</span>
                <span>₹{Number(bill.total_amount).toFixed(2)}</span>
              </div>
              <div className="bold" style={{ padding:'2px 0' }}>
                Payment: {bill.payment_status?.toUpperCase()}
              </div>
              {bill.bill_type === 'DPL' && (
                <div style={{ fontSize:'8px', marginTop:'4px' }}>
                  * Dealer Price List
                </div>
              )}
              <div style={{ borderTop:'1px dashed #000', marginTop:'8px', paddingTop:'4px', fontSize:'8px', textAlign:'center' }}>
                Terms: Goods once sold cannot be returned.
              </div>
            </div>
          ) : (
            <div style={{ position: 'absolute', bottom: '8mm', right: '8mm', fontSize: '10px', fontStyle: 'italic', color: '#555' }}>
              Continued on next page...
            </div>
          )}
        </div>
      ))}
    </>
  )
}
