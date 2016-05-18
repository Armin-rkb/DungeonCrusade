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
    private GameObject[] _inGameCharacters;

    private GameObject[] _playerObject;
    //GameObjects

    //Text
    private Text _countDownText;
    //Text

    //Float
    [SerializeField]
    private float _countDownTimer = 3f;
    //Float

    //Transform
    [SerializeField]
    private Transform[] _transformPoints;
    //Transform

    bool _runOnce;

	void Start ()
    {
        _countDownText = _countDownObj.GetComponent<Text>();
        StartCoroutine("StartRound");
	}
	

    void Update()
    {
        if (_countDownObj != null)
        CountDown();
    }


    private void CountDown()
    {
        if (_countDownTimer > 1)
        {
            _countDownTimer -= 1f * Time.deltaTime;

            _countDownText.text = _countDownTimer.ToString("0");
        }
    }

     IEnumerator StartRound()
    {
        _countDownObj.SetActive(true);

        yield return new WaitForSeconds(_countDownTimer);

        _countDownTimer = 3;
        _countDownObj.SetActive(false);

        InstantiateCharacters();

        _inGameCharacters = GameObject.FindGameObjectsWithTag(GameTags.player);      
    }

    public IEnumerator StartNewRound()
    {
            _countDownObj.SetActive(true);

            yield return new WaitForSeconds(_countDownTimer);

            _countDownTimer = 5;
            _countDownObj.SetActive(false);

            _inGameCharacters[0] = GameObject.Find("Player(Clone)");
            _inGameCharacters[1] = GameObject.Find("Player 2(Clone)");

            InstantiateNewCharacters();
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
    }
}
