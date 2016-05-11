using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using UnityEngine.UI;

public class MatchStart : MonoBehaviour {

    //GameObjects
    [SerializeField]
    private GameObject _countDownObj;
    [SerializeField]
    private List<GameObject> _amountCharacters;
    [SerializeField]
    private List<GameObject> _inGameCharacters;

    private GameObject[] _playerObject;
    //GameObjects

    //Text
    private Text _countDownText;
    //Text

    //Float
    private float _countDownTimer = 5f;
    //Float

    //Transform
    [SerializeField]
    private Transform[] _transformPoints;
    //Transform
   


	void Start ()
    {
        _countDownText = _countDownObj.GetComponent<Text>();

        StartCoroutine("StartRound");
	}
	

    void Update()
    {
        if (_countDownObj != null)
        CountDown();

        if (Input.GetKeyDown(KeyCode.B))
        {
            foreach (GameObject character in _amountCharacters)
                character.SetActive(false);
        }
    }


    private void CountDown()
    {
        if (_countDownTimer > 1)
        {
            _countDownTimer -= 1f * Time.deltaTime;

            _countDownText.text = _countDownTimer.ToString("0");
        }

    }
    public IEnumerator StartRound()
    {
        _countDownObj.SetActive(true);

        yield return new WaitForSeconds(_countDownTimer);

        _countDownTimer = 5;
        _countDownObj.SetActive(false);

        InstantiateCharacters();

        _playerObject = GameObject.FindGameObjectsWithTag(GameTags.player);

        foreach (GameObject player in _playerObject)
            _inGameCharacters.Add(player);
    }

    public IEnumerator StartNewRound()
    {
            _countDownObj.SetActive(true);

            yield return new WaitForSeconds(_countDownTimer);

            _countDownTimer = 5;
            _countDownObj.SetActive(false);

            InstantiateNewCharacters();

        /*
            _playerObject = GameObject.FindGameObjectsWithTag(GameTags.player);

        foreach (GameObject player in _playerObject)
            if (player != null)
            _inGameCharacters.Add(player);
         */

            _inGameCharacters[0] = GameObject.Find("RB_Player(Clone)");
            _inGameCharacters[1] = GameObject.Find("RB_Player 2(Clone)");
    }


    private void InstantiateCharacters()
    {
            Instantiate(_amountCharacters[0], _transformPoints[0].position, Quaternion.identity);
        //P1
            Instantiate(_amountCharacters[1], _transformPoints[1].position, Quaternion.identity);
        //P2  

    }

    private void InstantiateNewCharacters()
    {

        if (_inGameCharacters[0] == null)
                Instantiate(_amountCharacters[0], _transformPoints[0].position, Quaternion.identity);
                //P1
        else if (_inGameCharacters[1] == null)
                Instantiate(_amountCharacters[1], _transformPoints[1].position, Quaternion.identity);
                //P2  


    //    _playerObject.SetValue(0,0);
          //  foreach (GameObject player in _playerObject)
                
         
    }
     
    

}
