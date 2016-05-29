using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

public class JoinText : MonoBehaviour {

    [SerializeField]
    private List<Text> _joinedText;

    [SerializeField]
    private JoinCheck _joinCheck;

    void Awake()
    {
        _joinCheck.OnPlayerOneEnter += ChangeP1Text;
        _joinCheck.OnPlayerTwoEnter += ChangeP2Text;
        _joinCheck.OnPlayerThreeEnter += ChangeP3Text;
        _joinCheck.OnPlayerFourEnter += ChangeP4Text;

        _joinCheck.OnPlayerReady += ReadyText;

    }


    void ChangeP1Text()
    {
        _joinedText[0].text = "OK";
    }

    void ChangeP2Text()
    {
        _joinedText[1].text = "OK";
    }

    void ChangeP3Text()
    {
        _joinedText[2].text = "OK";
    }

    void ChangeP4Text()
    {
        _joinedText[3].text = "OK";
    }

    void ReadyText()
    {
        _joinedText[4].text = "Press A To Start";
    }
}
