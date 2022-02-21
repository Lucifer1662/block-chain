import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { AppBar, Button, TextField, Toolbar, Typography, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { Transaction, Wallet } from './blockchain';

const publicKey = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxwSh12hX297NXRpYatIV\nt54gzRPDdHWAOV5x9rrN5JqsSb7JFetU2GGhOyeNraafA/x0R1aVS4omiMZRMGmx\noG/R9XYd5iytHPDs5sb4gwLmAGnsYZH27dsBEn1PfD9TWdaEZwcgYhWBr+hPiykZ\n2zsjic7QsmLXcPH3S0L2ctxCxLXY0dkTFL3Se0qZp5hk1ExKyksPPuqE2givghRe\nJzb+AS2MXNjj5PTZhfoREolesBWFfy2P4++okS2OINPYFfWDjYU0Bx25PuSQc5bC\nbne/ONeb1ZGrnPAYQlBcjYa6ApUbCB2X59ol+4uNWHtannntQOP8VaF+WwSFtLDb\nAQIDAQAB\n-----END PUBLIC KEY-----\n"
const privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDHBKHXaFfb3s1d\nGlhq0hW3niDNE8N0dYA5XnH2us3kmqxJvskV61TYYaE7J42tpp8D/HRHVpVLiiaI\nxlEwabGgb9H1dh3mLK0c8OzmxviDAuYAaexhkfbt2wESfU98P1NZ1oRnByBiFYGv\n6E+LKRnbOyOJztCyYtdw8fdLQvZy3ELEtdjR2RMUvdJ7SpmnmGTUTErKSw8+6oTa\nCK+CFF4nNv4BLYxc2OPk9NmF+hESiV6wFYV/LY/j76iRLY4g09gV9YONhTQHHbk+\n5JBzlsJud78415vVkauc8BhCUFyNhroClRsIHZfn2iX7i41Ye1qeee1A4/xVoX5b\nBIW0sNsBAgMBAAECggEBAIxg/RNm+0oQn0TDt4gphb4N4M8m2KBF3VsZ/kLtwxsz\n6sDdvRMj+qXiP4rtPGc3d0SlhxNmxEoTOVkSoeQHOY6UMUH1veNEshsO6dtij5pB\nqiCyllTAU6+04c277BwUwuNEiAHwKexlhSOiNrFPHXjg/xFOezDIvXRiiG9i3Vlo\nOrKAzvAqtHw39PI5huvSt4a3iYFBSX06L1DZe8vRY7hjt3j8by6vLSvf6/xxvTAf\ne76UVhCLoLumXBf56+LAJH0DwBCla9Zu9UIbVpvypg2zKb2+R5QplAsCW44AcqUs\nuvUylP6iWZWeU+pZNKX4Hxfv45SXzPWaH4MjRxnMUBECgYEA80BORSHkmBnu8U5a\np8KoQblzK8VHvyui+Vzz8tcJWLOwpNV/eJvJ7k+U28rFJzvvLSBB6iyBsZXIU4WO\nvjWBiMBbUMKD9WWp+YYpYrySws9A19DPjavC2MCQXYPGuQ+rompb/uhsnJ9er4Qg\nBggDGzTQSmshupM2AzErhHbYdx0CgYEA0XLaK4UPfC0juYSIckykfkAmp+rXjzF9\njvXuD/TRWi6kYY0Utb4FjR3RJF36VIPyEzmUPRdDOQ8FbNWU4MMC1Zar1KK2ymQk\nr6lPdQZT7UdMnZTPi3/6AcqLliAyxInN9J+NYPx6wka6LShfHNYcgEtZLFf5gV2L\n9zozxQAAWjUCgYAsVupte5IZj5CYd7nanobhBBbUQa+kTyXz4letSjkv7AEk6q3D\npFIYmHT/42QwlKIyTZD2SIqTfkP3xX6ReVtVPArpG6vGDXQAQc5Fay4tSG3/aNaM\ncmSf8eneweh1Tz/v6Qc/3cn+eqZdw+26a7d1PBlDl2echLzxtALEsI0gmQKBgA1m\nfMDmDXyTYsK+0QAHGUsejZqWst3te6wG3glVT4OmkkvPe/C4zKAftT7PaHG502YZ\ne/uAnoNrC5zP+Wt77pV9w1aiZnGCgLpgab4B/qKiuism1zSEppkwvUeIndbnPi8V\nejUnUi9V2RmEiLlOlZo7t+PXaRY2xvq1VZSYEG21AoGAXE5vsdh+zyxs56V4mBi3\nx4p4hIVq72if6pHoA8/9bJXiAm8ZUGFoksdjDZ8o1w/dgb/i59PdwCukwQ7gypjI\nqZde0xnfPtvdNjGcZQrSOtE3f2rVZSrEpmS1JJP38ZMLRlZgyn0SjMpAARzjlUfH\nQRcwlXn3B5/fdQ0zSmSqZdg=\n-----END PRIVATE KEY-----"

function App() {
  const [nodes, setNodes] = useState<string[]>([]);
  const [reciever, setReceiver] = useState('');
  const [amount, setAmount] = useState('');




  return (
    <div className="App">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            Client
          </Typography>
        </Toolbar>
      </AppBar>


      <div style={{ padding: 30 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '30%', marginBottom: 10 }}>
          {nodes.map((node, index) => <div >
            <TextField onChange={(e) => { setNodes((prev) => { prev[index] = e.target.value; return prev }) }} />
            <IconButton onClick={() => {

              setNodes((prev) => {
                prev = [...prev]
                prev.splice(index, 1);
                return prev;
              })
            }} ><CloseIcon /></IconButton> </div>)}

        </div>
        <Button onClick={() => setNodes([...nodes, ''])} variant="contained">Add node</Button>
      </div>

      <div style={{ padding: 30 }}>
        <Typography variant="h5" >
          Wallet
        </Typography>
        {
          <>
            <TextField value={reciever} onChange={(e) => { setReceiver(e.target.value) }} />
            <TextField value={amount} onChange={(e) => { setAmount(e.target.value) }} />
            <Button onClick={async () => {

              const amountNum = Number.parseInt(amount);
              const wallet = new Wallet(publicKey, privateKey);
              const transaction = await wallet.transfer(reciever, amountNum)
              console.log(transaction);
              nodes.map(async (node) => {
                try{
                await fetch("http://" + node+"/addTransaction", {
                  method: "POST",
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({transaction, timestamp: Date.now()}),
                })
              }catch(e:any){
                console.log(e)
              }
              return 0;
              })

            }} variant="contained">Send</Button>

          </>
        }
      </div>


    </div >
  );
}

export default App;
