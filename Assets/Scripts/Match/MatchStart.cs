using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using UnityEngine.UI;

public class MatchStart : MonoBehaviour {

    [SerializeField] private RoundManager _roundManager;

    [SerializeField] private JoinManager _joinManager;

    //GameObjects

    [SerializeField]
    private GameObject _mainCountDown;
    [SerializeField]
    private GameObject[] _countDownObj;

    /*
     * 0 = P1
     * 1 = P2
     * 2 = P3
     * 3 = P4
     */


    [SerializeField] private List<GameObject> _amountCharacters;
    [SerializeField] private GameObject[] _inGameCharacters;
    //GameObjects

    //Text

    [SerializeField]
    private Text _mainCountdownText;

    [SerializeField]
    private Text[] _countDownText;

    /*
   * 0 = P1
   * 1 = P2
   * 2 = P3
   * 3 = P4
   */

    //Float
    [SerializeField]
    private float _countDownTimer = 3f;

    [SerializeField]
    private float[] _playerCountDownTimers;
    //Float

    //Transform
    [SerializeField]
    private Transform[] _transformPoints;
    //Transform


    private bool _P1dead;
    private bool _P2dead;
    private bool _P3dead;
    private bool _P4dead;

    bool _endGame;
    bool _runOnce;

    
    

    void Awake()
    {
        _roundManager.OnRoundEnd += StartAnotherRound;
        _roundManager.OnGameEnd += CheckEnd;
    }

	void Start ()
    {
        StartCoroutine("StartRound");
	}
	

    void Update()
    {
        CountDown();
    }


    private void CountDown()
    {
        if (_countDownTimer >= 1)
        {
            _countDownTimer -= 1f * Time.deltaTime;

            _mainCountdownText.text = _countDownTimer.ToString("0");
        }


            if (_countDownObj[0].activeSelf)
            {
                if(_playerCountDownTimers[0] >= 1)
                {
                    _playerCountDownTimers[0] -= 1f * Time.deltaTime;
                    _countDownText[0].text = _playerCountDownTimers[0].ToString("0");
                }
                
            }
            else if (_countDownObj[1].activeSelf)
            {
                if (_playerCountDownTimers[1] >= 1)
                {
                    _playerCountDownTimers[1] -= 1f * Time.deltaTime;
                    _countDownText[1].text = _playerCountDownTimers[1].ToString("0");
                }
               
            }
            else if (_countDownObj[2].activeSelf)
            {
                if (_playerCountDownTimers[2] >= 1)
                {
                    _playerCountDownTimers[2] -= 1f * Time.deltaTime;
                    _countDownText[2].text = _playerCountDownTimers[2].ToString("0");
                }
              
            }
            else if (_countDownObj[3].activeSelf)
            {
                if (_playerCountDownTimers[3] >= 1)
                {
                    _playerCountDownTimers[3] -= 1f * Time.deltaTime;
                    _countDownText[3].text = _playerCountDownTimers[3].ToString("0");
                }
                
            }
    }

     IEnumerator StartRound()
    {
        foreach (GameObject countdown in _countDownObj)
            countdown.SetActive(false);

        yield return new WaitForSeconds(_countDownTimer);

        _countDownTimer = 3;
        _mainCountDown.SetActive(false);

        InstantiateTwoCharacters();

        _inGameCharacters = GameObject.FindGameObjectsWithTag(GameTags.player);      
    }

    private void StartAnotherRound()
     {
         StartCoroutine("StartNewRound");
     }

    public IEnumerator StartNewRound()
    {

        _inGameCharacters[0] = GameObject.Find("Player(Clone)");
        _inGameCharacters[1] = GameObject.Find("Player 2(Clone)");
        if (GameObject.Find("Player 3(Clone)") != null)
            _inGameCharacters[2] = GameObject.Find("Player 3(Clone)");
        if (GameObject.Find("Player 4(Clone)") != null)
            _inGameCharacters[3] = GameObject.Find("Player 4(Clone)");

        yield return new WaitForSeconds(.1f);

        
        if (_inGameCharacters[0] == null)
        {
            
            _P1dead = true;
            _countDownObj[0].SetActive(true);
            _playerCountDownTimers[0] = 3f;

            StartCoroutine("P1Revive");
            
            //P1          
        }


        if (_inGameCharacters[1] == null)
        {
            
            _P2dead = true;
           
            _countDownObj[1].SetActive(true);
            _playerCountDownTimers[1] = 3f;
            StartCoroutine("P2Revive");
            //P1          
        }

        if (_joinManager.Players == 3)
        {
            if (_inGameCharacters[2] == null)
            {
                
                _P3dead = true;
                _countDownObj[2].SetActive(true);
                _playerCountDownTimers[2] = 3f;
                StartCoroutine("P3Revive");
                //P1          
            }
        }


        if (_joinManager.Players == 4)
        {
            if (_inGameCharacters[2] == null)
            {
                
                _P3dead = true;
                
                _countDownObj[2].SetActive(true);
                _playerCountDownTimers[2] = 3f;
                StartCoroutine("P3Revive");
                //P1          
            }


            if (_inGameCharacters[3] == null)
            {
                _P4dead = true;
                
                _countDownObj[3].SetActive(true);
                _playerCountDownTimers[3] = 3f;
                StartCoroutine("P4Revive");
                //P1          
            }
        }
    }


    private void InstantiateTwoCharacters()
    {
            Instantiate(_amountCharacters[0], _transformPoints[0].position, Quaternion.identity);
        //P1
            Instantiate(_amountCharacters[1], _transformPoints[1].position, Quaternion.identity);
        //P2  
        if (_joinManager.Players == 3 )
            Instantiate(_amountCharacters[2], _transformPoints[2].position, Quaternion.identity);

        else if (_joinManager.Players > 3)
        {
            Instantiate(_amountCharacters[2], _transformPoints[2].position, Quaternion.identity);
            Instantiate(_amountCharacters[3], _transformPoints[3].position, Quaternion.identity);
        }
        
    }

    IEnumerator P1Revive()
    {
        yield return new WaitForSeconds(3);
        if(_P1dead)
        {
            if (_inGameCharacters[0] == null)
            {
                Instantiate(_amountCharacters[0], _transformPoints[0].position, Quaternion.identity);
                _countDownObj[0].SetActive(false);
                _P1dead = false;
            }
            
        }
        
    }
    IEnumerator P2Revive()
    {
        yield return new WaitForSeconds(3);
        if (_P2dead)
        {
            if (_inGameCharacters[1] == null)
            {
                Instantiate(_amountCharacters[1], _transformPoints[1].position, Quaternion.identity);
                _countDownObj[1].SetActive(false);
                _P2dead = false;
            }
        }
       
    }
    IEnumerator P3Revive()
    {
        yield return new WaitForSeconds(3);
        if (_P3dead)
        {
            if (_inGameCharacters[2] == null)
            {
                Instantiate(_amountCharacters[2], _transformPoints[2].position, Quaternion.identity);
                _countDownObj[2].SetActive(false);
                _P3dead = false;
            }
        }
        
    }
    IEnumerator P4Revive()
    {
        yield return new WaitForSeconds(3);
        if(_P4dead)
        {
            if (_inGameCharacters[3] == null)
            {
                Instantiate(_amountCharacters[3], _transformPoints[3].position, Quaternion.identity);
                _countDownObj[3].SetActive(false);
                _P4dead = false;
            }
        }
        
    }

    /*
    private void InstantiateNewCharacters()
    {
        if (_playerCountDownTimers[0] <= 1.001 && _P1dead)
        {
            
            //P1          
        }

        else if (_playerCountDownTimers[1] <= 1.001 && _P2dead)
        {
           
            //P2
        }

        else if (_playerCountDownTimers[2] <= 1.001 && _P3dead)
        {
           
            //P3   
        }

        else if (_playerCountDownTimers[3] <= 1.001 && _P4dead)
        {
            
            //P4   
        }
                     
    }
     */

    void CheckEnd()
    {
        _endGame = true;

        if (_endGame)
        {
            StopCoroutine("AddNewRound");
            _mainCountDown.SetActive(false);
        }
           
    }
}
