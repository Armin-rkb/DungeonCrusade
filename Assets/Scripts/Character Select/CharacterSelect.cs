using UnityEngine;
using System.Collections;
using UnityEngine.UI;

public class CharacterSelect : MonoBehaviour {

    [SerializeField]
    private GameObject _CSSObject;

    [SerializeField]
    private GameObject _countDownObj;

    private bool _P1Chose;
    private bool _P2Chose;

    private Text _countDownText;

    private float _countDownTimer = 5f;

    [SerializeField]
    private Transform[] _transformPoints;

    [SerializeField]
    private GameObject[] _characterModes;

    [SerializeField]
    private GameObject[] _readyObj;

    /*
     * 0 = P1 Ready
     * 1 = P2 Ready
     */

	void Start () {


        foreach (GameObject ready in _readyObj)
            ready.SetActive(false);

        _countDownText = _countDownObj.GetComponent<Text>();
        StartCoroutine("SelectCharacter");
	}
	

    private void CountDown()
    {
        _countDownTimer -= 1f * Time.deltaTime;

        _countDownText.text = _countDownTimer.ToString("0");
    }

    void Update()
    {

        CountDown();

        if (Input.GetKeyDown(KeyCode.X))
        {
            _P1Chose = true;
            _readyObj[0].SetActive(true);
        }

        if (Input.GetKeyDown(KeyCode.Y))
        {
            _P2Chose = true;
            _readyObj[1].SetActive(true);
        }
    }

    private IEnumerator SelectCharacter()
    {

        yield return new WaitForSeconds(_countDownTimer);
            Destroy(_CSSObject.gameObject);
            _countDownTimer = 5;
            _countDownObj.SetActive(false);

            foreach (GameObject ready in _readyObj)
                ready.SetActive(false);


            yield return new WaitForSeconds(2);
            InstantiateCharacters();
        
    }


    private void InstantiateCharacters()
    {
        Instantiate(_characterModes[0], _transformPoints[0].position, Quaternion.identity);
        //P1
        Instantiate(_characterModes[1], _transformPoints[1].position, Quaternion.identity);
        //P2
    }

}
