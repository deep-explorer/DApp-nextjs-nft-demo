import {formatEther, parseEther, formatUnits} from "@ethersproject/units";
import {useWeb3React} from "@web3-react/core";
import getReceipt from "../lib/getReceipt";
import {addToast} from "../hooks/useToast";
import {useEffect, useState} from 'react';
import {BigNumber} from '@ethersproject/bignumber';
import {isAddress} from "@ethersproject/address";
import {Contract} from "@ethersproject/contracts";
import ABI from "../constants/abi/conjure.json";
import COLLATERAL_ABI from "../constants/abi/Collateral.json";
import ERC20_ABI from "../constants/abi/erc20.json";
import Select, {components} from 'react-select'

import { useRouter } from 'next/router'
import {
    CHAINLINK_OPTIONS, CONJURE_FACTORY_ADDRESS,
    INFURA_ID,
    INFURA_NETWORK,
} from "../constants";
import {InfuraProvider} from "@ethersproject/providers";
import {defaultAbiCoder, Interface} from "@ethersproject/abi";
import {DateTime} from "luxon";
import {getEtherscanLink} from "../lib/utils";
import Link from "next/link";
import CONJURE_FACTORY_ABI from "../constants/abi/conjure_factory.json";
const encoder = defaultAbiCoder

function Manage() {
    const router = useRouter();
    const library_infura = new InfuraProvider(INFURA_NETWORK, INFURA_ID);

    //getting the contract of minty
    const {account, library} = useWeb3React();

    //new for details
    const [conjureAddress, setConjureAddress] = useState('');

    const [first_router, set_first_router] = useState(0);
    const [first_autocheck, set_first_autocheck] = useState(0);
    const [check_query, set_check_query] = useState(0);

    const [ischecked, setischecked] = useState(false);
    const [isinited, setisinited] = useState(false);

    const [owner,setowner] = useState("0x0000000000000000000000000000000000000000");
    const [approvebuttontext, setapprovebuttontext] = useState("Conjure New Asset");

    // conjure states
    const [tokentotalsupply, settokentotalsupply] = useState(0);
    const [tokendecimals, settokendecimals] = useState(0);
    const [tokensymbol, settokensymbol] = useState('NULL');
    const [tokenname, settokenname] = useState('NULL');
    const [contractbalance, setcontractbalance] = useState(0);
    const [userbalance, setuserbalance] = useState(0);
    const [assetType, setAssetType] = useState(0);
    const [oracleData, setOracleData] = useState([]);
    const [numoracles, setnumoracles] = useState(0);
    const [lastPrice, setLastPrice] = useState(0);
    const [lastTime, setLastTime] = useState(BigNumber.from(0));
    
    // collateral
    const [collateralAddress, setCollateralAddress] = useState('');

    // to set for init the contract
    const [fee, setFee] = useState(0);
    const [indexdivisor, setindexdivisor] = useState(1);
    const [indexprice, setindexprice] = useState(0);
    const [type, setType] = useState(0);
    const [fields, setFields] = useState([]);

    // owner functions
    const [newowner, setnewowner] = useState("");

    const [recent_events, set_recent_events] = useState([]);

    // effect hook for updating data
    useEffect(() => {

        if (first_router === 0)
        {
            set_first_router(1);
            if (router.query && router.query.conjure_address)
            {
                setConjureAddress(router.query.conjure_address);
                set_check_query(1);
            }
            else
            {
                const splitter = router.asPath.split('address=');
                console.log(splitter);

                try
                {
                    let my_address = splitter[1];
                    console.log(my_address);

                    if (my_address !== undefined)
                    {
                        setConjureAddress(my_address);
                        set_check_query(1);
                    }
                }
                catch (e) {
                    console.log(e);
                }
            }
        }
    }, []);

    // effect hook for updating data
    useEffect(() => {

        // update the ui elements
        async function updateUIStates() {
            console.log('updating')
            await checkConjureDetails();
            console.log('updating finished')
        }

        // schedule
        const timer = setInterval(() => {
                if (first_autocheck === 0 && conjureAddress !== '' && check_query === 1)
                {
                    console.log('first auto check')
                    console.log(first_autocheck)
                    set_first_autocheck(1);
                    updateUIStates();
                }
        }, 300);

        // clearing interval
        return () => clearInterval(timer);
    }, [account, library, conjureAddress, first_autocheck, check_query]);


    //format addresses in ui
    function format_address(address)
    {
        const new_address = address.substring(0,5) + '...' + address.slice(-3)
        return new_address;
    }

    function getOracleType(oratype)
    {
        if (oratype === 0)
        {
            return "Chainlink";
        }
        if (oratype === 1)
        {
            return "Uniswap";
        }

        return "Custom";
    }

    // effect hook for updating data
    useEffect(() => {
        if(conjureAddress)
        {
            getConjureEvents();
        }

    }, [conjureAddress]);

    async function getConjureEvents()
    {
        let callingaddress = conjureAddress;
        const conjure_contract = isAddress(callingaddress) && !!ABI && !!library_infura ? new Contract(callingaddress, ABI, library_infura) : undefined;

        const collateral_address = await conjure_contract._collateralContract();

        const collateral_contract = isAddress(collateral_address) && !!COLLATERAL_ABI && !!library_infura ? new Contract(collateral_address, COLLATERAL_ABI, library_infura) : undefined;

        // get all the open loan events
        let filter_open = collateral_contract.filters.LoanCreated();
        const past_events_loan_open = await library_infura.getLogs({
            fromBlock: 0,
            toBlock: "latest",
            address: collateral_contract.address,
            topics: filter_open['topics']
        });

        let filter_close = collateral_contract.filters.LoanClosed();
        const past_events_loan_close = await library_infura.getLogs({
            fromBlock: 0,
            toBlock: "latest",
            address: collateral_contract.address,
            topics: filter_close['topics']
        });

        console.log(123)
        const eventParser = new Interface(COLLATERAL_ABI)

        let contract_array = [];

        past_events_loan_open?.map(event => {
            const eventParsed = eventParser.parseLog(event).args
            contract_array.push({name: "Mint", blockNumber: event.blockNumber, address: eventParsed.account, amount: eventParsed.amount, loanID: eventParsed.loanID  })
        })

        past_events_loan_close?.map(event => {
            const eventParsed = eventParser.parseLog(event).args

            contract_array.push({name: "Burn", blockNumber: event.blockNumber, address: eventParsed.account, amount: 0, loanID: eventParsed.loanID})
        })

        console.log(contract_array)

        // get all loan ids open
        let temp_conj_info = [];

        let k;
        for (k = 0; k < contract_array.length; k++) {
            const blockData = await library_infura.getBlock(contract_array[k].blockNumber)

            let enddate = DateTime.fromSeconds(blockData.timestamp)

            if (contract_array[k].name == "Burn")
            {
                const loan = await collateral_contract.getLoan(contract_array[k].address, contract_array[k].loanID);
                console.log(loan)
                const temp_amount = loan.loanAmount;

                contract_array[k].amount = temp_amount;
            }

            temp_conj_info.push({name: contract_array[k].name,address:  contract_array[k].address, amount: contract_array[k].amount,createtime: enddate.toLocaleString(DateTime.DATETIME_SHORT), inner_date: enddate});
        }

        temp_conj_info.sort(function(a,b){
            // Turn your strings into dates, and then subtract them
            // to get a value that is either negative, positive, or zero.
            return new Date(b.inner_date) - new Date(a.inner_date);
        });

        set_recent_events(temp_conj_info);
    }

    async function checkConjureDetails() {
        console.log(conjureAddress)

        let callingaddress = conjureAddress;
        let resolvedaddress = await library_infura.resolveName(conjureAddress);

        // if we have an resolved address we take it
        if (resolvedaddress)
        {
            console.log(resolvedaddress);
            callingaddress = resolvedaddress;
            setConjureAddress(callingaddress);
        }

        console.log(callingaddress)

        const conjure_contract = isAddress(callingaddress) && !!ABI && !!library_infura ? new Contract(callingaddress, ABI, library_infura) : undefined;
        console.log(conjure_contract);
        try {
            const owner = await conjure_contract._owner();
            console.log(owner);
            setowner(owner);
            setischecked(true);

            const init = await  conjure_contract._inited();
            setisinited(init);
            console.log(init)
            
            const collateral = await  conjure_contract._collateralContract();
            setCollateralAddress(collateral)
            console.log(collateral)
            
            const totalsupply = await conjure_contract.totalSupply();
            const symbol = await conjure_contract.symbol();
            const decimals = await conjure_contract.decimals();
            const name = await conjure_contract.name();
            const assettype = await conjure_contract._assetType();
            const lastprice = await conjure_contract._latestobservedprice();
            const lastpricetime = await conjure_contract._latestobservedtime();


            // get oracles
            const oraclenumber = await conjure_contract._numoracles();
            setnumoracles(oraclenumber.toNumber());

            let ora_array = [];

            let i;
            for (i = 0; i < oraclenumber.toNumber(); i++) {
                let temp_prop = await conjure_contract._oracleData(i);
                ora_array.push(temp_prop);
            }

            setOracleData(ora_array);
            settokentotalsupply(totalsupply);
            settokendecimals(decimals);
            settokensymbol(symbol);
            settokenname(name);
            setAssetType(assettype);
            setLastPrice(lastprice);
            setLastTime(lastpricetime);

            console.log(totalsupply)
            console.log(decimals)
            console.log(symbol)
            console.log(name)
            console.log(assettype)
            console.log(lastprice)
            console.log(lastpricetime)
            console.log(oraclenumber)
            console.log(ora_array)

            const balance = await library_infura.getBalance(callingaddress);
            setcontractbalance(balance);

            if (account)
            {
                const userbalance = await conjure_contract.balanceOf(account);
                setuserbalance(userbalance)
            }

        } catch (e) {
            console.log(e)
            setischecked(false);
            addToast({body:"The address provided does not resolve to a valid Conjure Address", type: "error"});
        }
    }

    async function initConjure() {

        const conjure_contract = isAddress(conjureAddress) && !!ABI && !!library ? new Contract(conjureAddress, ABI, library.getSigner(account)) : undefined;

        console.log(fields)

        // control weights
        let weights = 0;
        let addressesarray = [];
        let typesarray = [];
        let signaturesarray = [];
        let calldataaray = [];
        let valuesarray = [];
        let weightsarray = [];
        let decimalsarray = [];

        // get values dynamically from all input fields
        for (let i = 0; i < fields.length; i++) {
            // check if addresses are set
            if (fields[i].oracleaddress === "" || fields[i].oracleaddress === null)
            {
                addToast({body: "Please provide a valid address for each price source", type: "error"});
                return;
            }

            weights = weights + fields[i].weight;

            addressesarray.push(fields[i].oracleaddress);
            typesarray.push(fields[i].oracletype);
            signaturesarray.push(fields[i].signature);
            calldataaray.push(fields[i].calldata);
            valuesarray.push(fields[i].value);
            weightsarray.push(fields[i].weight);

            if (fields[i].oracletype === 1)
            {
                let temp_erc20_contract = isAddress(fields[i].oracleaddress) && !!ERC20_ABI && !!library ? new Contract(fields[i].oracleaddress, ERC20_ABI, library.getSigner(account)) : undefined;
                let decimalss = await temp_erc20_contract.decimals();
                console.log(decimalss)
                decimalsarray.push(decimalss)
            }
            else
            {
                decimalsarray.push(fields[i].decimal);
            }
        }

        // check if weights are accurate
        if (weights !== 100 && type === 1)
        {
            addToast({body: "All weights must add up to 100", type: "error"});
            return;
        }

        if (fee < 0)
        {
            addToast({body: "Fee cant be negative", type: "error"});
            return;
        }
        if (fee > 2.5)
        {
            addToast({body: "Fee cant be more than 2.5%", type: "error"});
            return;
        }


        console.log(type)
        console.log(addressesarray)
        console.log(typesarray)
        console.log(signaturesarray)
        console.log(calldataaray)
        console.log(valuesarray)
        console.log(weightsarray)
        console.log(decimalsarray)

        let parameters = encoder.encode(
            ['uint256'],
            [0]
        )

        let tempfee = fee;

        if (isNaN(tempfee))
        {
            tempfee = 0;
        }
        console.log(tempfee)

        console.log(parameters)

        let divisor = indexdivisor;

        if (type === 0)
        {
            divisor = 1;
        }

        if (divisor <= 0)
        {
            addToast({body: "Divisor cant be 0", type: "error"});
            return;
        }

        try {
            const {hash} = await conjure_contract.init(tempfee * 100, type, divisor, addressesarray, typesarray, signaturesarray, calldataaray, valuesarray, weightsarray, decimalsarray);
            await getReceipt(hash, library);
        } catch (e) {
            addToast({body: e.message, type: "error"});
        }

        checkConjureDetails();
    }

    async function changeOwner()
    {
        const conjure_contract = isAddress(conjureAddress) && !!ABI && !!library ? new Contract(conjureAddress, ABI, library.getSigner(account)) : undefined;

        try {
            const {hash} = await conjure_contract.changeOwner(newowner);
            await getReceipt(hash, library);
        } catch (e) {
            addToast({body: e.message, type: "error"});
        }

        setnewowner("");
        checkConjureDetails();
    }

    async function collectFees()
    {
        const conjure_contract = isAddress(conjureAddress) && !!ABI && !!library ? new Contract(conjureAddress, ABI, library.getSigner(account)) : undefined;

        try {
            const {hash} = await conjure_contract.collectFees();
            await getReceipt(hash, library);
        } catch (e) {
            addToast({body: e.message, type: "error"});
        }

        checkConjureDetails();
    }

    async function updatePrice()
    {
        const conjure_contract = isAddress(conjureAddress) && !!ABI && !!library ? new Contract(conjureAddress, ABI, library.getSigner(account)) : undefined;

        try {
            const {hash} = await conjure_contract.getPrice();
            await getReceipt(hash, library);
        } catch (e) {
            addToast({body: e.message, type: "error"});
        }

        checkConjureDetails();
    }

    async function checkassetprice()
    {
        console.log('in');

        let temp_price = 0;

        // get values dynamically from all input fields
        for (let i = 0; i < fields.length; i++) {
            // check if addresses are set
            if (fields[i].oracleaddress === "" || fields[i].oracleaddress === null)
            {
                addToast({body: "Cant calculate price, please specify all price addresses", type: "error"});
                return;
            }

            let turl = "https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=" + fields[i].oracleaddress + "&vs_currencies=usd&include_market_cap=true";

            const res = await fetch(turl);
            const json = await res.json();

            let mcap = json[fields[i].oracleaddress]['usd_market_cap']

            // sqrt
            if (type === 3)
            {
                mcap = Math.sqrt(mcap);
            }

            temp_price = temp_price + mcap;
        }

        setindexprice(temp_price / indexdivisor);
    }

    // get the timestamp
    function fetchTimeStamp()
    {
        let enddate = DateTime.fromSeconds(lastTime.toNumber());
        return enddate.toLocaleString(DateTime.DATETIME_FULL);
    }

    function getUserDetails()
    {
        if (account)
        {
            return (
                <div className="py-4 w-full md:w-6/12 md:flex justify-center text-center">
                    <div className="py-4 rounded-2xl w-full bg-purple-500">
                        <p className="text-center text-lg font-bold text-white">
                            Your Asset Balance
                        </p>
                        <p className="text-center text-lg font-bold text-white">
                            {formatEther(userbalance)} {tokensymbol}
                        </p>
                        <br/>
                        <p className="text-center text-lg font-bold text-white">
                            Latest Price
                        </p>
                        <p className="text-center text-lg font-bold text-white">
                            {formatEther(lastPrice)}
                        </p>
                        <br/>
                        <p className="text-center text-lg font-bold text-white">
                            recorded on
                        </p>
                        <p className="text-center text-lg font-bold text-white">
                            {fetchTimeStamp()}
                        </p>
                        <br/>
                        <p className="text-center text-lg font-bold text-white">
                            Assets in Circulation:
                        </p>
                        <p className="text-center text-lg font-bold text-white">
                            {formatEther(tokentotalsupply)}
                        </p>
                        <div className="py-1 w-full text-center">
                            <button className="py-3 pr-2 pl-2 rounded-3xl md:w-3/12 w-6/12 bg-indigo-500 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500"
                                    type="button" onClick={() => updatePrice()}>
                                <p className="capitalize text-center text-sm  font-bold text-white">Update Price</p>
                            </button>
                        </div>
                    </div>
                </div>

            )
        }
        else
        {
            return "";
        }
    }

    function handleChangeConjureAddress(event) {
        const values = event.target.value;
        setConjureAddress(values);
    }

    function handleChangeType(event) {
        const values = event.value;
        setType(values);
    }

    function handleChangeFee(event) {
        const values = parseFloat(event.target.value);
        setFee(values);
    }
    function handleChangeIndexDivisor(event) {
        const values = event.target.value;

        if (values <= 0)
        {
            setindexdivisor(1);
        }
        else
        {
            setindexdivisor(values);
        }
    }

    function handleChangeAddress(i, event) {
        const values = [...fields];
        values[i].oracleaddress = event.target.value;
        setFields(values);
    }

    function handleChangeAddressSelect(i, event) {
        const values = [...fields];
        console.log(event)
        values[i].oracleaddress = event.value;
        setFields(values);
    }

    function handleChangeDecimals(i, event) {
        const values = [...fields];
        values[i].decimal = parseInt(event.target.value);
        setFields(values);
    }

    function handleChangeWeight(i, event) {
        const values = [...fields];
        values[i].weight = parseInt(event.target.value);
        setFields(values);
    }

    function handleChangeSignature(i, event) {
        const values = [...fields];
        values[i].signature = event.target.value;
        setFields(values);
    }

    function handleChangeCalldata(i, event) {
        const values = [...fields];
        values[i].calldata = event.target.value;
        setFields(values);
    }

    function handleAddChainlink() {
        const values = [...fields];
        values.push({oracleaddress: "", oracletype: 0, signature: "", calldata: 0x00, value: 0, weight: 0, decimal: 8});
        setFields(values);
    }

    function handleAddUniswap() {
        const values = [...fields];
        values.push({oracleaddress: "", oracletype: 1, signature: "", calldata: 0x00, value: 0, weight: 0, decimal: 0});
        setFields(values);
    }
    function handleAddCustom() {
        const values = [...fields];
        values.push({oracleaddress: "", oracletype: 2, signature: "", calldata: 0x00, value: 0, weight: 0, decimal: 8});
        setFields(values);
    }

    function handleAddConjure() {
        const values = [...fields];
        values.push({oracleaddress: "", oracletype: 2, signature: "getPrice()", calldata: 0x00, value: 0, weight: 0, decimal: 18});
        setFields(values);
    }

    function handleRemove(i) {
        const values = [...fields];
        values.splice(i, 1);
        setFields(values);
    }

    function handleChangeOwner(event) {
        const values = event.target.value;
        setnewowner(values);
    }

    const options = [
        {value: 0, label: 'Single Asset (different oracles for 1 asset)'},
        {value: 1, label: 'Basket Asset (various prices to form a basket)'},
        {value: 2, label: 'Index (Market Cap Price)'},
        {value: 3, label: 'Index (Sqrt Market Cap Price)'}
    ]


    //format addresses in ui
    function format_address(address)
    {
        const new_address = address.substring(0,5) + '...' + address.slice(-3)
        return new_address;
    }

    function copylink ()
    {
        const el = document.getElementById('toCopy');

        const minty_uri = "https://conjure.finance/manage";
        const stringer = minty_uri + "?address=" + conjureAddress;
        el.value = stringer;
        //el.setAttribute('readonly', '');
        //el.style = {position: 'absolute', left: '-9999px',height: '0', opacity: '.01'};
        //document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        addToast({body:"Copied Link To Your Clipboard", type: "success"});
    }

    return (

        <div className="container">
            <div className="py-16 min-w-full flex flex-col justify-start items-center">

                <div className="py-4 w-full flex justify-center">
                    <div className="py-4  rounded-2xl  w-full bg-purple-500">
                        <p className="text-center text-lg font-bold text-white">
                            Manage your Conjure Asset
                        </p>
                    </div>
                </div>
                <div className="py-4 w-full">

                    <div className="md:flex flex-row w-full justify-center">
                        <div className="py-4 pr-2 pl-2  rounded-2xl w-full md:w-6/12 bg-purple-500">
                            <p className="text-center text-lg font-bold text-white">
                                Enter Conjure Address or ENS Name
                            </p>
                            <input required className="text-center w-full justify-center" type="text"
                                   onChange={e => handleChangeConjureAddress( e)} value={conjureAddress}/>
                        </div>

                    </div>
                </div>
                <div className="py-1 w-full">

                    <div className="py-1 w-full flex justify-center text-center">
                        <div className="py-1 w-full">
                            <button className="py-3 pr-2 pl-2 rounded-3xl md:w-3/12 w-6/12 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500"
                                    type="button" onClick={() => checkConjureDetails() }>
                                <p className="capitalize text-center text-sm font-bold text-white">Get Details</p>
                            </button>
                        </div>
                    </div>
                </div>

                {(ischecked === true && isinited === false) ? (
                    <div className="py-1 w-full">
                        <div className="py-4 w-full flex justify-center">
                            <div className="py-4  rounded-2xl  w-full bg-purple-500">
                                <p className="text-center text-lg font-bold text-white">
                                    Asset Specification
                                </p>
                            </div>
                        </div>
                        <div className="py-4 w-full">
                            <div className="md:flex flex-row w-full justify-center">
                                <div
                                    className="py-4 pr-2 pl-2 sm:mr-2 mt-2 rounded-2xl w-full md:w-6/12 min-w-0 bg-purple-500">
                                    <p className="text-center text-lg font-bold text-white">
                                        Asset Type
                                    </p>
                                    <Select options={options}
                                            onChange={e => handleChangeType(e)}/>
                                </div>
                                <div
                                    className="py-4 pl-2 pr-2 mt-2 rounded-2xl w-full md:w-6/12 min-w-0 bg-purple-500">
                                    <p className="text-center text-lg font-bold text-white">
                                        Minting Fee in % (not required)
                                    </p>
                                    <input className="text-center w-full justify-center" type="number"
                                           onChange={e => handleChangeFee(e)}/>
                                </div>
                            </div>
                        </div>

                        <div className="py-4 w-full flex justify-center">
                            <div className="py-4  rounded-2xl  w-full bg-purple-500">
                                <p className="text-center text-lg font-bold text-white">
                                    Add your Price Sources
                                </p>
                            </div>
                        </div>
                        {fields.map((field, idx) => {
                            return (
                                <div className="py-4 w-full" key={`${field}-${idx}`}>

                                    { field.oracletype === 0 ?
                                        <div className="md:flex flex-row w-full justify-center bg-purple-500 rounded-3xl">
                                            <div className="py-4 pr-2 pl-2 content-box w-full md:w-6/12">
                                                <p className="text-center text-lg font-bold text-white">
                                                    Oracle Type
                                                </p>
                                                <p className="text-center text-lg font-bold text-white">
                                                    Chainlink
                                                </p>
                                            </div>
                                            <div className="py-4 pl-2 pr-2 content-box w-full md:w-6/12">
                                                <p className="text-center text-lg font-bold text-white">
                                                    Select Price Feed
                                                </p>
                                                <Select options={CHAINLINK_OPTIONS}
                                                        onChange={e => handleChangeAddressSelect(idx, e)}/>
                                            </div>
                                            {( type !== 0 ?
                                            <div className="py-4 pl-2 pr-2 content-box w-full md:w-6/12">
                                                <p className="text-center text-lg font-bold text-white">
                                                    Oracle Weight (%)
                                                </p>
                                                <input className="text-center w-full justify-center" type="number"
                                                       onChange={e => handleChangeWeight(idx, e)}/>
                                            </div>
                                            : ""
                                            )}
                                            <div className="py-4 pl-2 pr-2 text-center w-full md:w-1/12">
                                                <button className="btn bg-gradient-to-r from-red-400 to-red-500" type="button"
                                                        onClick={() => handleRemove(idx)}>
                                                    <p className=" hover:text-white">X</p>
                                                </button>
                                            </div>
                                        </div>
                                        :
                                        (field.oracletype === 1 ?
                                                <div className="md:flex flex-row w-full justify-center bg-purple-500 rounded-3xl">
                                                    <div className="py-4 pr-2 pl-2 content-box w-full md:w-6/12">
                                                        <p className="text-center text-lg font-bold text-white">
                                                            Oracle Type
                                                        </p>
                                                        <p className="text-center text-lg font-bold text-white">
                                                            Uniswap
                                                        </p>
                                                    </div>
                                                    <div className="py-4 pl-2 pr-2 content-box w-full md:w-6/12">
                                                        <p className="text-center text-lg font-bold text-white">
                                                            Token Address
                                                        </p>
                                                        <input className="text-center w-full justify-center" type="text"
                                                               onChange={e => handleChangeAddress(idx, e)}/>
                                                    </div>
                                                    {( type === 1 ?
                                                    <div className="py-4 pl-2 pr-2 content-box w-full md:w-6/12">
                                                        <p className="text-center text-lg font-bold text-white">
                                                            Oracle Weight (%)
                                                        </p>
                                                        <input className="text-center w-full justify-center" type="number"
                                                               onChange={e => handleChangeWeight(idx, e)}/>
                                                    </div>
                                                        : ""
                                                    )}
                                                    <div className="py-4 pl-2 pr-2 text-center w-full md:w-1/12">
                                                        <button className="btn bg-gradient-to-r from-red-400 to-red-500" type="button"
                                                                onClick={() => handleRemove(idx)}>
                                                            <p className=" hover:text-white">X</p>
                                                        </button>
                                                    </div>
                                                </div>
                                                :

                                             (field.signature !== "getPrice()" ?

                                                <div className="md:flex flex-row w-full justify-center bg-purple-500 rounded-3xl">
                                                    <div className="py-4 pr-2 pl-2 content-box w-full md:w-6/12">
                                                        <p className="text-center text-lg font-bold text-white">
                                                            Oracle Type
                                                        </p>
                                                        <p className="text-center text-lg font-bold text-white">
                                                            Custom
                                                        </p>
                                                    </div>
                                                    <div className="py-4 pl-2 pr-2 content-box w-full md:w-6/12">
                                                        <p className="text-center text-lg font-bold text-white">
                                                            Address
                                                        </p>
                                                        <input className="text-center w-full justify-center" type="text"
                                                               onChange={e => handleChangeAddress(idx, e)}/>
                                                    </div>
                                                    <div className="py-4 pl-2 pr-2 content-box w-full md:w-6/12">
                                                        <p className="text-center text-lg font-bold text-white">
                                                            Function Signature
                                                        </p>
                                                        <input className="text-center w-full justify-center" type="text"
                                                               onChange={e => handleChangeSignature(idx, e)}/>
                                                    </div>
                                                    <div className="py-4 pl-2 pr-2 content-box w-full md:w-6/12">
                                                        <p className="text-center text-lg font-bold text-white">
                                                            Calldata
                                                        </p>
                                                        <textarea className="text-center w-full justify-center" type="text"
                                                               onChange={e => handleChangeCalldata(idx, e)}/>
                                                    </div>
                                                    <div className="py-4 pl-2 pr-2 content-box w-full md:w-6/12">
                                                        <p className="text-center text-lg font-bold text-white">
                                                            Decimals
                                                        </p>
                                                        <input className="text-center w-full justify-center" type="number"
                                                               onChange={e => handleChangeDecimals(idx, e)}/>
                                                    </div>
                                                    {( type === 1 ?
                                                    <div className="py-4 pl-2 pr-2 content-box w-full md:w-6/12">
                                                        <p className="text-center text-lg font-bold text-white">
                                                            Oracle Weight (%)
                                                        </p>
                                                        <input className="text-center w-full justify-center" type="number"
                                                               onChange={e => handleChangeWeight(idx, e)}/>
                                                    </div>
                                                        :
                                                        ""
                                                    )}
                                                    <div className="py-4 pl-2 pr-2 text-center w-full md:w-1/12">
                                                        <button className="btn bg-gradient-to-r from-red-400 to-red-500" type="button"
                                                                onClick={() => handleRemove(idx)}>
                                                            <p className=" hover:text-white">X</p>
                                                        </button>
                                                    </div>
                                                </div>


                                                    :

                                                    <div className="md:flex flex-row w-full justify-center bg-purple-500 rounded-3xl">
                                                        <div className="py-4 pr-2 pl-2 content-box w-full md:w-6/12">
                                                            <p className="text-center text-lg font-bold text-white">
                                                                Oracle Type
                                                            </p>
                                                            <p className="text-center text-lg font-bold text-white">
                                                                Conjure
                                                            </p>
                                                        </div>
                                                        <div className="py-4 pl-2 pr-2 content-box w-full md:w-6/12">
                                                            <p className="text-center text-lg font-bold text-white">
                                                                Address
                                                            </p>
                                                            <input className="text-center w-full justify-center" type="text"
                                                                   onChange={e => handleChangeAddress(idx, e)}/>
                                                        </div>
                                                        {( type === 1 ?
                                                                <div className="py-4 pl-2 pr-2 content-box w-full md:w-6/12">
                                                                    <p className="text-center text-lg font-bold text-white">
                                                                        Oracle Weight (%)
                                                                    </p>
                                                                    <input className="text-center w-full justify-center" type="number"
                                                                           onChange={e => handleChangeWeight(idx, e)}/>
                                                                </div>
                                                                :
                                                                ""
                                                        )}
                                                        <div className="py-4 pl-2 pr-2 text-center w-full md:w-1/12">
                                                            <button className="btn bg-gradient-to-r from-red-400 to-red-500" type="button"
                                                                    onClick={() => handleRemove(idx)}>
                                                                <p className=" hover:text-white">X</p>
                                                            </button>
                                                        </div>
                                                    </div>

                                        )
                                        )
                                    }

                                </div>
                            );
                        })}

                        {type === 0 || type === 1 ?
                            <div className="py-1 w-full">
                                <button className="py-3 pr-2 pl-2 rounded-3xl md:w-3/12 w-3/12 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-blue-500 to-purple-500" type="button"
                                        onClick={() => handleAddChainlink()}>
                                    <p className="capitalize text-center text-sm font-bold text-white">Chainlink</p>
                                </button>
                                <button className="py-3 pr-2 pl-2 rounded-3xl md:w-3/12 w-3/12 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-blue-500 to-purple-500" type="button"
                                        onClick={() => handleAddUniswap()}>
                                    <p className="capitalize text-center text-sm font-bold text-white">Uniswap</p>
                                </button>
                                <button className="py-3 pr-2 pl-2 rounded-3xl md:w-3/12 w-3/12 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-blue-500 to-purple-500" type="button"
                                        onClick={() => handleAddCustom()}>
                                    <p className="capitalize text-center text-sm font-bold text-white">Custom</p>
                                </button>
                                <button className="py-3 pr-2 pl-2 rounded-3xl md:w-3/12 w-3/12 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-blue-500 to-purple-500" type="button"
                                        onClick={() => handleAddConjure()}>
                                    <p className="capitalize text-center text-sm font-bold text-white">Conjure</p>
                                </button>

                                {type === 1 ?
                                    <div className="py-4 w-full">
                                    <div className="md:flex flex-row w-full justify-center has-tooltip">
                                        <span className='tooltip rounded shadow-lg p-1 bg-purple-700 text-white -mt-20 md:-mt-10'>
                                            You can use this to make the price more manageable by increasing this value to reduce the given price. This is useful for indices and market cap based synths.
                                    </span>
                                    <div
                                    className="py-4 pr-2 pl-2 sm:mr-2 mt-2 rounded-2xl w-full md:w-6/12 min-w-0 bg-purple-500">
                                    <p className="text-center text-lg font-bold text-white">
                                    Enter your Price Divisor
                                    </p>
                                    <input required className="text-center w-full justify-center" type="number"
                                    onChange={e => handleChangeIndexDivisor( e)} value={indexdivisor}/>
                                    </div>
                                    </div>
                                    </div>
                                    :
                                    ""
                                }
                            </div>
                            :
                            <div className="py-1 w-full text-center">
                                <button className="py-3 pr-2 pl-2 rounded-3xl md:w-4/12 w-4/12 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500" type="button"
                                        onClick={() => handleAddUniswap()}>
                                    <p className="capitalize text-center text-sm font-bold text-white">Uniswap</p>
                                </button>
                                <div className="py-4 w-full">
                                    <div className="md:flex flex-row w-full justify-center has-tooltip">
                                        <span className='tooltip rounded shadow-lg p-1 bg-purple-700 text-white -mt-48 md:-mt-10'>
                                            You can use this to make the price more manageable by increasing this value to reduce the given price. This is useful for indices and market cap based synths.
                                    </span>
                                        <div
                                            className="py-4 pr-2 pl-2 sm:mr-2 mt-2 rounded-2xl w-full md:w-6/12 min-w-0 bg-purple-500">
                                            <p className="text-center text-lg font-bold text-white">
                                                Enter your Index Divisor
                                            </p>
                                            <input required className="text-center w-full justify-center" type="number"
                                                   onChange={e => handleChangeIndexDivisor( e)} value={indexdivisor}/>
                                        </div>
                                        <div
                                            className="py-4 pl-2 pr-2 mt-2 rounded-2xl w-full md:w-6/12 min-w-0 bg-purple-500">
                                            <button className="py-3 pr-2 pl-2 rounded-3xl md:w-4/12 w-4/12 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500" type="button"
                                                    onClick={() => checkassetprice()}>
                                                <p className="capitalize text-center text-sm font-bold text-white">Check your Asset Price</p>
                                            </button>
                                            <p className="text-center text-lg font-bold text-white">
                                                ${indexprice}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }

                        <div className="py-1 w-full flex justify-center text-center">
                            <div className="py-1 w-full">
                                <button className="py-3 pr-2 pl-2 rounded-3xl md:w-3/12 w-6/12 bg-indigo-500 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500"
                                        type="button" onClick={() => initConjure()}>
                                    <p className="capitalize text-center text-sm  font-bold text-white">{approvebuttontext}</p>
                                </button>
                            </div>
                        </div>

                    </div>
                ) : ("")
                }

                {(isinited === true) ? (
                    <div className="py-8 min-w-full flex flex-col justify-start items-center">
                        <div className="py-4 w-full flex justify-center">
                            <div className="py-4  rounded-2xl w-full bg-purple-500">
                                <p className="text-center text-lg font-bold text-white">
                                    Details for Asset:<br/>
                                    {tokenname} ({tokensymbol})
                                </p>
                            </div>
                        </div>
                        { getUserDetails()}

                        <div className="py-4 w-full md:w-8/12 md:flex justify-center text-center">
                            <div className="py-4 rounded-2xl w-full bg-purple-500">
                                <p className="text-center text-lg font-bold text-white">
                                    This Asset consists of
                                </p>
                                <br/>
                                {oracleData.map((prop, i) => (
                                    <p className="text-center text-lg font-bold text-white" key={i}>
                                        {getOracleType(prop.oracleType.toNumber())} <br/> Address: <a target="_blank" href={getEtherscanLink(1,prop.oracleaddress, "ADDRESS")}>{format_address(prop.oracleaddress)}</a> <br/>Weight: {prop.weight.toNumber()}% <br/><br/>
                                    </p>
                                ))}
                            </div>
                        </div>
                        <div className="py-1 w-full text-center">
                            <Link href={"/loan" + "?address=" + conjureAddress}>
                            <button className="py-3 pr-2 pl-2 rounded-3xl md:w-3/12 w-6/12 bg-indigo-500 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500"
                                    type="button">
                                <p className="capitalize text-center text-sm  font-bold text-white">Open A Loan</p>
                            </button>
                            </Link>

                        </div>
                        <div className="py-1 w-full text-center">
                                <button className="py-3 pr-2 pl-2 rounded-3xl md:w-3/12 w-6/12 bg-indigo-500 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500"
                                        type="button" onClick={() => copylink() }>
                                    <p className="capitalize text-center text-sm  font-bold text-white">Copy Link</p>
                                </button>
                        </div>
                    </div>
                ) : ("")
                }
                {(recent_events.length > 0 ?

                        <div className="py-1 w-full">
                            <div className="py-4 w-full flex justify-center">
                                <div className="py-4  rounded-2xl  w-full bg-purple-500">
                                    <p className="text-center text-lg font-bold text-white">
                                        Recent Events
                                    </p>
                                </div>
                            </div>
                            <table className="table-auto py-4 w-full">
                                <thead className="w-full justify-center rounded-2xl w-full min-w-0 bg-purple-500">
                                <tr className="py-4 pr-2 sm:pr-10 sm:pl-8 pl-2 sm:mr-2 ">
                                    <th className="text-center sm:text-lg text-xs font-bold text-white border-white border-2">Event</th>
                                    <th className="text-center sm:text-lg text-xs font-bold text-white border-white border-2">Address</th>
                                    <th className="text-center sm:text-lg text-xs font-bold text-white border-white border-2">Amount</th>
                                    <th className="text-center sm:text-lg text-xs font-bold text-white border-white border-2">Time</th>
                                </tr>
                                </thead>
                                <tbody className="w-full justify-center rounded-2xl w-full min-w-0">

                                {recent_events.map((field, idx) => {
                                    return (
                                            <tr className="py-4 pr-2 sm:pr-10 sm:pl-8 pl-2 sm:mr-2 cursor-pointer bg-indigo-400 hover:bg-purple-400" key={`${field}-${idx}`}>
                                                <td className="text-center sm:text-lg text-xs font-bold text-white border-white border-2 ">{recent_events[idx].name}</td>
                                                <td className="text-center sm:text-lg text-xs font-bold text-white border-white border-2 ">{format_address(recent_events[idx].address)}</td>
                                                <td className="text-center sm:text-lg text-xs font-bold text-white border-white border-2 ">{formatEther(recent_events[idx].amount)}</td>
                                                <td className="text-center sm:text-lg text-xs font-bold text-white border-white border-2">{recent_events[idx].createtime}</td>
                                            </tr>
                                    );
                                })}
                                </tbody>
                            </table>


                        </div>

                        :
                        ""
                )}

                {(isinited === true && account === owner) ? (
                    <div className="py-4 w-full">
                        <div className="md:flex flex-row w-full justify-center">
                            <div
                                className="py-4 pr-2 pl-2 sm:mr-2 mt-2 rounded-2xl w-full md:w-6/12 min-w-0 bg-purple-500">
                                <p className="text-center text-lg font-bold text-white">
                                    Available to Withdraw:<br/>
                                    {formatEther(contractbalance)} ETH
                                </p>
                                <div className="py-1 w-full text-center">
                                    <button className="py-3 pr-2 pl-2 rounded-3xl md:w-3/12 w-6/12 bg-indigo-500 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500"
                                            type="button" onClick={() => collectFees()}>
                                        <p className="capitalize text-center text-sm  font-bold text-white">Collect Fees</p>
                                    </button>
                                </div>
                            </div>
                            <div
                                className="py-4 pl-2 pr-2 mt-2 rounded-2xl w-full md:w-6/12 min-w-0 bg-purple-500">
                                <p className="text-center text-lg font-bold text-white">
                                    Change Owner To
                                </p>
                                <input className="text-center w-full justify-center" type="text"
                                       onChange={e => handleChangeOwner(e)} value={newowner}/>
                                <div className="py-1 w-full text-center">
                                    <button className="py-3 pr-2 pl-2 rounded-3xl md:w-3/12 w-6/12 bg-indigo-500 hover:bg-purple-300 cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500"
                                            type="button" onClick={() => changeOwner()}>
                                        <p className="capitalize text-center text-sm  font-bold text-white">Change Owner</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : ("")
                }

            </div>
            <textarea id="toCopy" aria-hidden="true"></textarea>
            <style jsx>
                {`
         
          [aria-hidden="true"] {
              opacity: 0;
             
              z-index: -9999;
              
            }
          
            `}
            </style>
        </div>
    );
}

export default Manage
