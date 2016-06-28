using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

public class JoinText : MonoBehaviour {


    /*
     * This script handles the visibility of all text on the Join menu.
     * You could call this the delegate listener.
     */

    [SerializeField] private List<GameObject> _pressStartText;
    [SerializeField] private List<Text> _joinedText;

    [SerializeField] private JoinCheck _joinCheck;
    [SerializeField] private JoinButton _joinButton;

    void Awake()
    {
        _joinCheck.OnPlayerOneEnter += ChangeP1Text;
        _joinCheck.OnPlayerTwoEnter += ChangeP2Text;
        _joinCheck.OnPlayerThreeEnter += ChangeP3Text;
        _joinCheck.OnPlayerFourEnter += ChangeP4Text;

        _joinCheck.OnPlayerOneEnter += RemoveP1StartText;
        _joinCheck.OnPlayerTwoEnter += RemoveP2StartText;
        _joinCheck.OnPlayerThreeEnter += RemoveP3StartText;
        _joinCheck.OnPlayerFourEnter += RemoveP4StartText;

        _joinCheck.OnPlayerReady += ReadyText;
        _joinButton.OnPlayersJoined += DestroyAllStartText;

        /*
         * Delegate factory.
         * Whenever a delegate gets sent from another script,
         * The function appointed to them will run.
         */
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

    /*
     * Whenever one of the players have pressed their join button,
     * The text on their box will turn to an OK,
     * To give them the feedback they need to know they succeeded.
     */

    void RemoveP1StartText()
    {
        Destroy(_pressStartText[0].gameObject);
    }

    void RemoveP2StartText()
    {
        Destroy(_pressStartText[1].gameObject);
    }

    void RemoveP3StartText()
    {
        Destroy(_pressStartText[2].gameObject);
    }

    void RemoveP4StartText()
    {
        Destroy(_pressStartText[3].gameObject);
    }

    /*
     * This removes the text above the OK text whenever someone joined.
     */

    void ReadyText()
    {
        _joinedText[4].text = "Press SPACE To Start";
    }

    void DestroyAllStartText()
    {
        foreach (GameObject allstart in _pressStartText)
        {
            if (allstart != null)
                Destroy(allstart.gameObject);
        }
    }
}
