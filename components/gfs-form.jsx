'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  Download,
  Upload,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  draftGfsReport,
  createGFS,
  getGFSById,
  updateGFS,
} from '@/app/dashboard/client/report-compliance/smr-filing/gfs/actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import SelectCaseList from './ui/SelectCaseList';

export const defaultGFSData = {
  suspicionType: 'Offence against a Commonwealth, State or Territory Law',
  suspicionReason: '',
  customerName: '',
  customerUID: '',
  companyName: '',
  customerAge: 0,
  suspicionDates: '',
  accountOpeningDate: '',
  sourceOfFunds: '',
  accountOpeningPurpose: '',
  reviewStartDate: '',
  reviewEndDate: '',
  totalDeposited: 0,
  totalSuspicionAmount: 0,
  ofis: [],
  transactions: [],
  cryptoAddresses: [],
  ipAddresses: [],
  additionalNotes: '',

  // suspicionIntensity: "",
  // suspicionBehaviour: "",
  // totalWithdrawn: 0,
  // pois: [],
  // customerCountry: "Australia",
};
//accountOpeningPurpose,
export function GFSForm({ id }) {
  const [formData, setFormData] = useState(defaultGFSData);
  const [generatedReport, setGeneratedReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const router = useRouter();

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getFormDataById = async () => {
    setFetching(true);
    try {
      const response = await getGFSById(id);
      console.log('response', response);
      if (response?.succeed || response?.success) {
        setFormData(response?.data);
      }
      // setFormData(response?.data);
    } catch (error) {
      console.error('error', error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (id) {
      getFormDataById();
    }
  }, [id]);

  const addTransaction = (obj) => {
    const newTransaction = {
      id: Date.now().toString(),
      date: '',
      amount: 0,
      type: 'Domestic Electronic Fund Transfer',
      fromBank: '',
      fromAccount: '',
      fromName: '',
      toAccount: formData.customerUID,
      reference: '',
      cryptoAddress: '',
      ...(obj ? obj : {}),
    };
    updateField('transactions', [...formData.transactions, newTransaction]);
  };

  const updateTransaction = (id, field, value) => {
    updateField(
      'transactions',
      formData.transactions.map((t) =>
        t.id === id ? { ...t, [field]: value } : t
      )
    );
  };

  const removeTransaction = (id) => {
    updateField(
      'transactions',
      formData.transactions.filter((t) => t.id !== id)
    );
  };

  const addPOI = () => {
    const newPOI = {
      id: Date.now().toString(),
      name: '',
      bank: '',
      account: '',
      reference: '',
    };
    updateField('pois', [...formData.pois, newPOI]);
  };

  const updatePOI = (id, field, value) => {
    updateField(
      'pois',
      formData.pois.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const removePOI = (id) => {
    updateField(
      'pois',
      formData.pois.filter((p) => p.id !== id)
    );
  };

  const addOFI = () => {
    const newOFI = {
      id: Date.now().toString(),
      name: '',
      reportDate: '',
      scamType: '',
    };
    updateField('ofis', [...formData.ofis, newOFI]);
  };

  const updateOFI = (id, field, value) => {
    updateField(
      'ofis',
      formData.ofis.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  const removeOFI = (id) => {
    updateField(
      'ofis',
      formData.ofis.filter((o) => o.id !== id)
    );
  };

  const addIPAddress = (obj) => {
    const newIP = {
      id: Date.now().toString(),
      address: '',
      country: '',
      date: '',
      ...(obj ? obj : {}),
    };
    updateField('ipAddresses', [...formData.ipAddresses, newIP]);
  };

  const updateIPAddress = (id, field, value) => {
    updateField(
      'ipAddresses',
      formData.ipAddresses.map((ip) =>
        ip.id === id ? { ...ip, [field]: value } : ip
      )
    );
  };

  const removeIPAddress = (id) => {
    updateField(
      'ipAddresses',
      formData.ipAddresses.filter((ip) => ip.id !== id)
    );
  };

  const addCryptoAddress = () => {
    updateField('cryptoAddresses', [...formData.cryptoAddresses, '']);
  };

  const updateCryptoAddress = (index, value) => {
    const updated = [...formData.cryptoAddresses];
    updated[index] = value;
    updateField('cryptoAddresses', updated);
  };

  const removeCryptoAddress = (index) => {
    updateField(
      'cryptoAddresses',
      formData.cryptoAddresses.filter((_, i) => i !== index)
    );
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result);
        setFormData(json);
      } catch (error) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(formData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gfs-${formData.customerUID || 'data'}.json`;
    link.click();
  };

  const exportReport = () => {
    if (!generatedReport) {
      alert('Please generate the report first');
      return;
    }
    const dataBlob = new Blob([generatedReport], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gfs-report-${formData.customerUID || 'report'}.txt`;
    link.click();
  };

  const handleSubmit = async () => {
    console.log('formData', JSON.stringify(formData, null, 2));
    setLoading(true);
    try {
      const submittedData = {
        ...formData,
        id: id,
      };
      console.log('submittedData', JSON.stringify(submittedData, null, 2));
      const action = id ? updateGFS : createGFS;
      const response = await action(submittedData);
      console.log('response', response);
      if (response.success || response.succeed) {
        localStorage.setItem('newId', response.data?._id);
        const toastMessage = id
          ? 'GFS report updated successfully'
          : 'GFS report created successfully';
        toast.success(toastMessage);
        router.push('/dashboard/client/report-compliance/smr-filing/gfs');
      } else {
        toast.error('Failed to create GFS report');
      }
    } catch (error) {
      console.error('error', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Draft the GFS for the chosen case.
   *
   * Every figure here — the review period, the totals, the transactions, the
   * counterparties and the IP evidence — is computed by our API from our own
   * models; only the suspicion summary comes from the AI service
   * (docs/74 §4.3). The draft is our GFS document, so the field names below
   * are ours rather than a third-party payload's.
   */
  const handleCaseNumberChange = async (value) => {
    setFetching(true);
    try {
      const response = await draftGfsReport(value.value);
      const doc = response?.succeed ? response.data : null;
      if (!doc) {
        console.error('Failed to draft GFS', response?.message);
        return;
      }

      setFormData({
        ...formData,
        // theirs
        suspicionReason: doc.suspicionReason || doc.suspicionSummary || '',
        // ours
        customerName: doc.customerName,
        customerUID: doc.customerUID,
        accountOpeningPurpose: doc.accountOpeningPurpose,
        accountOpeningDate: doc.accountOpeningDate,
        companyName: doc.companyName ?? '',
        sourceOfFunds: doc.sourceOfFunds ?? '',
        customerAge: doc.customerAge,
        reviewStartDate: doc.reviewStartDate,
        reviewEndDate: doc.reviewEndDate,
        totalDeposited: doc.totalDeposited,
        totalWithdrawn: doc.totalWithdrawn,
        totalSuspicionAmount: doc.totalSuspicionAmount,
      });

      (doc.transactions || []).forEach((transaction) => {
        addTransaction({
          date: transaction.date,
          amount: transaction.amount,
          // `uid` is the transaction's own reference; the old mapping read a
          // key that never existed, so every row was left blank.
          reference: transaction.uid || transaction.reference || '',
          type: [transaction.subtype, transaction.type].filter(Boolean).join(' '),
        });
      });

      (doc.ipAddresses || []).forEach((ipAddress) => {
        addIPAddress({
          address: ipAddress.address,
          country: ipAddress.country,
          date: '',
        });
      });
    } catch (error) {
      console.error('Failed to draft GFS', error);
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Card className="p-8 border-2 border-primary/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold ">
              Grounds for Suspicion (GFS) Generator
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Generate formatted suspicion reports
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import JSON
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button variant="outline" onClick={exportData}>
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="max-w-sm">
            <SelectCaseList
              label="Case Number"
              onChange={handleCaseNumberChange}
              value={formData.caseNumber}
            />
          </div>
          {/* Suspicion Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold  border-b border-primary/20 pb-2">
              Suspicion Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Suspicion Type</Label>
                <Input
                  value={formData.suspicionType}
                  onChange={(e) => updateField('suspicionType', e.target.value)}
                  placeholder="e.g., Offence against a Commonwealth Law"
                  disabled={fetching}
                />
              </div>
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Suspicion Reason</Label>
                <Input
                  value={formData.suspicionReason}
                  onChange={(e) =>
                    updateField('suspicionReason', e.target.value)
                  }
                  placeholder="e.g., Person/agent is not who they claim to be"
                />
              </div>
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Suspicion Dates</Label>
                <Input
                  value={formData.suspicionDates}
                  type="date"
                  onChange={(e) =>
                    updateField('suspicionDates', e.target.value)
                  }
                  placeholder="Date range of suspicious activity"
                />
              </div>
              {/* <div>
                <Label>Suspicion Intensity</Label>
                <Input
                  value={formData.suspicionIntensity}
                  onChange={(e) =>
                    updateField("suspicionIntensity", e.target.value)
                  }
                  placeholder="e.g., High, Medium, Low"
                />
              </div> */}
            </div>
            {/* <div>
              <Label>Suspicion Behaviour</Label>
              <Textarea
                value={formData.suspicionBehaviour}
                onChange={(e) =>
                  updateField("suspicionBehaviour", e.target.value)
                }
                placeholder="Describe the suspicious behaviour"
                rows={3}
              />
            </div> */}
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold  border-b border-primary/20 pb-2">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Customer Name</Label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Customer UID</Label>
                <Input
                  value={formData.customerUID}
                  onChange={(e) => updateField('customerUID', e.target.value)}
                  placeholder="Account/Customer ID"
                />
              </div>
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Company Name</Label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  placeholder="Financial institution name"
                />
              </div>
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Customer Age</Label>
                <Input
                  type="number"
                  value={formData.customerAge || ''}
                  onChange={(e) =>
                    updateField(
                      'customerAge',
                      Number.parseInt(e.target.value) || 0
                    )
                  }
                  placeholder="Age in years"
                />
              </div>
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Account Opening Date</Label>
                <Input
                  type="date"
                  value={formData.accountOpeningDate}
                  onChange={(e) =>
                    updateField('accountOpeningDate', e.target.value)
                  }
                />
              </div>
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Source of Funds</Label>
                <Input
                  value={formData.sourceOfFunds}
                  onChange={(e) => updateField('sourceOfFunds', e.target.value)}
                  placeholder="e.g., Employment, Business"
                />
              </div>
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Account Opening Purpose</Label>
                <Input
                  value={formData.accountOpeningPurpose}
                  onChange={(e) =>
                    updateField('accountOpeningPurpose', e.target.value)
                  }
                  placeholder="e.g., Personal banking, Investment"
                />
              </div>
              {/* <div>
                <Label>Customer Country</Label>
                <Input
                  value={formData.customerCountry}
                  onChange={(e) =>
                    updateField("customerCountry", e.target.value)
                  }
                  placeholder="Country of identification"
                />
              </div> */}
            </div>
          </div>

          {/* Transaction Review Period */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold  border-b border-primary/20 pb-2">
              Transaction Review Period
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Review Start Date</Label>
                <Input
                  type="date"
                  value={formData.reviewStartDate}
                  onChange={(e) =>
                    updateField('reviewStartDate', e.target.value)
                  }
                />
              </div>
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Review End Date</Label>
                <Input
                  type="date"
                  value={formData.reviewEndDate}
                  onChange={(e) => updateField('reviewEndDate', e.target.value)}
                />
              </div>
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Total Deposited ($)</Label>
                <Input
                  type="number"
                  value={formData.totalDeposited || ''}
                  onChange={(e) =>
                    updateField(
                      'totalDeposited',
                      Number.parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                />
              </div>
              <div className={fetching ? ' animate-pulse' : ''}>
                <Label>Total Suspicion Amount ($)</Label>
                <Input
                  type="number"
                  value={formData.totalSuspicionAmount || ''}
                  onChange={(e) =>
                    updateField(
                      'totalSuspicionAmount',
                      Number.parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Other Financial Institutions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold  border-b border-primary/20 pb-2 flex-1">
                Other Financial Institutions (OFI)
              </h3>
              <Button
                onClick={addOFI}
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add OFI
              </Button>
            </div>
            {formData.ofis.map((ofi) => (
              <Card key={ofi.id} className="p-4 bg-muted/30">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-sm">OFI Details</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOFI(ofi.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Institution Name</Label>
                    <Input
                      value={ofi.name}
                      onChange={(e) =>
                        updateOFI(ofi.id, 'name', e.target.value)
                      }
                      placeholder="e.g., Bendigo Bank"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Report Date</Label>
                    <Input
                      type="date"
                      value={ofi.reportDate}
                      onChange={(e) =>
                        updateOFI(ofi.id, 'reportDate', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Scam Type</Label>
                    <Input
                      value={ofi.scamType}
                      onChange={(e) =>
                        updateOFI(ofi.id, 'scamType', e.target.value)
                      }
                      placeholder="e.g., jobs and employment scam"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Transactions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold  border-b border-primary/20 pb-2 flex-1">
                Transactions
              </h3>
              <Button
                onClick={addTransaction}
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </div>
            {formData.transactions.map((transaction) => (
              <Card key={transaction.id} className="p-4 bg-muted/30">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-sm">Transaction Details</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTransaction(transaction.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={transaction.date}
                      onChange={(e) =>
                        updateTransaction(
                          transaction.id,
                          'date',
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Amount ($)</Label>
                    <Input
                      type="number"
                      value={transaction.amount || ''}
                      onChange={(e) =>
                        updateTransaction(
                          transaction.id,
                          'amount',
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Transaction Type</Label>
                    <Input
                      value={transaction.type}
                      onChange={(e) =>
                        updateTransaction(
                          transaction.id,
                          'type',
                          e.target.value
                        )
                      }
                      placeholder="e.g., Domestic EFT"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">From Bank</Label>
                    <Input
                      value={transaction.fromBank}
                      onChange={(e) =>
                        updateTransaction(
                          transaction.id,
                          'fromBank',
                          e.target.value
                        )
                      }
                      placeholder="Bank name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">From Account</Label>
                    <Input
                      value={transaction.fromAccount}
                      onChange={(e) =>
                        updateTransaction(
                          transaction.id,
                          'fromAccount',
                          e.target.value
                        )
                      }
                      placeholder="Account number"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">From Name</Label>
                    <Input
                      value={transaction.fromName}
                      onChange={(e) =>
                        updateTransaction(
                          transaction.id,
                          'fromName',
                          e.target.value
                        )
                      }
                      placeholder="Account holder name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">To Account</Label>
                    <Input
                      value={transaction.toAccount}
                      onChange={(e) =>
                        updateTransaction(
                          transaction.id,
                          'toAccount',
                          e.target.value
                        )
                      }
                      placeholder="Destination account"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reference Number</Label>
                    <Input
                      value={transaction.reference}
                      onChange={(e) =>
                        updateTransaction(
                          transaction.id,
                          'reference',
                          e.target.value
                        )
                      }
                      placeholder="OFI reference"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Crypto Address (if applicable)
                    </Label>
                    <Input
                      value={transaction.cryptoAddress || ''}
                      onChange={(e) =>
                        updateTransaction(
                          transaction.id,
                          'cryptoAddress',
                          e.target.value
                        )
                      }
                      placeholder="Wallet address"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Crypto Addresses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold  border-b border-primary/20 pb-2 flex-1">
                Crypto Wallet Addresses
              </h3>
              <Button
                onClick={addCryptoAddress}
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Address
              </Button>
            </div>
            {formData.cryptoAddresses.map((address, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={address}
                  onChange={(e) => updateCryptoAddress(index, e.target.value)}
                  placeholder="Crypto wallet address"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCryptoAddress(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          {/* IP Addresses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold  border-b border-primary/20 pb-2 flex-1">
                IP Addresses
              </h3>
              <Button
                onClick={addIPAddress}
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add IP
              </Button>
            </div>
            {formData.ipAddresses.map((ip) => (
              <Card key={ip.id} className="p-4 bg-muted/30">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-sm">IP Address Details</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIPAddress(ip.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">IP Address</Label>
                    <Input
                      value={ip.address}
                      onChange={(e) =>
                        updateIPAddress(ip.id, 'address', e.target.value)
                      }
                      placeholder="e.g., 192.168.1.1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Country</Label>
                    <Input
                      value={ip.country}
                      onChange={(e) =>
                        updateIPAddress(ip.id, 'country', e.target.value)
                      }
                      placeholder="e.g., China"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date Used</Label>
                    <Input
                      type="date"
                      value={ip.date}
                      onChange={(e) =>
                        updateIPAddress(ip.id, 'date', e.target.value)
                      }
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Additional Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold  border-b border-primary/20 pb-2">
              Additional Notes
            </h3>
            <Textarea
              value={formData.additionalNotes}
              onChange={(e) => updateField('additionalNotes', e.target.value)}
              placeholder="Any additional information or observations"
              rows={4}
            />
          </div>

          {/* Generate Report Button */}
          <div className="flex gap-4">
            {/* <Button
              onClick={generateReport}
              className="flex-1 bg-primary -foreground hover:bg-primary/90"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button> */}
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                'Submit'
              )}
            </Button>
            {generatedReport && (
              <Button
                onClick={exportReport}
                variant="outline"
                className="border-accent text-accent hover:bg-accent/10 bg-transparent"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            )}
          </div>

          {/* Generated Report Display */}
          {generatedReport && (
            <Card className="p-6 bg-muted/50">
              <h3 className="text-lg font-semibold  mb-4">Generated Report</h3>
              <div className="whitespace-pre-wrap text-sm leading-relaxed font-mono bg-background p-4 rounded border">
                {generatedReport}
              </div>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );

  function generateReport() {
  const report = `This report is in relation to suspicion for ${
    formData.suspicionReason
  } related to "${
    formData.customerName
  }". It appears that the above-mentioned customer's identity might have been used to attempt to transfer funds of fraudulent origin.

Customer Profile:

"${formData.companyName}" account "${formData.customerUID}" in the name of "${
    formData.customerName
  }", aged ${formData.customerAge} years, was opened on "${
    formData.accountOpeningDate
  }". Source of funds was selected as ${
    formData.sourceOfFunds
  }. Account opening purpose is selected as ${formData.accountOpeningPurpose}.

Transaction Analysis:

Transaction review of "${formData.companyName}" account "${
    formData.customerUID
  }" from "${formData.reviewStartDate}" till "${
    formData.reviewEndDate
  }" reveals that a total of $${formData.totalDeposited.toLocaleString()} was deposited followed by rapid purchases and withdrawals of cryptocurrencies within a few days.

${formData.ofis
  .map(
    (ofi) =>
      `On ${ofi.reportDate}, "${formData.companyName}" received multiple third-party requests from ${ofi.name} pertaining to fraudulent transactions related to ${ofi.scamType}.`
  )
  .join('\n\n')}

Upon investigation into "${formData.companyName}" account "${
    formData.customerUID
  }" reveals that:

${formData.transactions
  .map(
    (t, i) =>
      `• ${t.type} of $${t.amount.toLocaleString()} from ${
        t.fromBank
      } account ${t.fromAccount} in the name of "${t.fromName}" to "${
        formData.companyName
      }" account "${t.toAccount}" on "${t.date}"${
        t.reference
          ? ` which was reported as a fraudulent transaction by ${
              formData.ofis[0]?.name || 'OFI'
            } with reference number "${t.reference}"`
          : ''
      }.`
  )
  .join('\n\n')}

"${formData.companyName}" system shows that all the funds were transferred to ${
    formData.cryptoAddresses.length
  } crypto wallet address${
    formData.cryptoAddresses.length > 1 ? 'es' : ''
  } ${formData.cryptoAddresses.map((addr) => `"${addr}"`).join(', ')}.

Conclusion:

It was reported by ${formData.ofis
    .map((ofi) => `"${ofi.name}"`)
    .join(', ')} that the account held by "${
    formData.customerName
  }" is the recipient of funds of fraud origin totalling $${formData.totalSuspicionAmount.toLocaleString()} which are subjected to fraudulent investigations related to ${formData.ofis
    .map((ofi) => ofi.scamType)
    .join(', ')}.

The accounts held by "${formData.customerName}" is unusual because ${
    formData.transactions.length > 0
      ? 'a ' + formData.transactions[0].type + ' was conducted'
      : 'transactions were conducted'
  } followed by rapid purchase of cryptocurrency and withdrawal within few days.

${
  formData.ipAddresses.length > 0
    ? `In addition to that all IP addresses used by "${formData.customerName}" accounts were located only within ${formData.ipAddresses[0].country} whereas his identification is from ${formData.customerCountry}, which further adds to the suspicion.`
    : ''
}

${
  formData.additionalNotes
    ? `\nAdditional Notes:\n${formData.additionalNotes}`
    : ''
}`;

  setGeneratedReport(report);
  }
}
