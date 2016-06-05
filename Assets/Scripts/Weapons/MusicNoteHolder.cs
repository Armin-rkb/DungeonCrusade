using UnityEngine;
using System.Collections;

public class MusicNoteHolder : MonoBehaviour, IWeapon
{
    [SerializeField] private MusicNote[] musicnote;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;
    [SerializeField] private PlayerMovement playernumber;

    public void Shoot()
    {
        if (flip.facingRight)
        {
            Vector2 shootPos = transform.position;
            StartCoroutine(SpawnRight(shootPos));
        }

        else
        {
            Vector2 shootPos = transform.position;
            StartCoroutine(SpawnLeft(shootPos));
        }
    }

    IEnumerator SpawnRight(Vector2 shootPos)
    {
        for (int j = 0; j < musicnote.Length; j++)
        {
            MusicNote currMusicNote = Instantiate(musicnote[j], new Vector2(shootPos.x + .1f, shootPos.y), musicnote[j].transform.rotation) as MusicNote;
            Physics2D.IgnoreCollision(currMusicNote.GetComponent<Collider2D>(), musicnote[j].GetComponent<Collider2D>());
            currMusicNote.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;

            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currMusicNote.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currMusicNote.GetComponent<MusicNote>().ShootRight();
            yield return new WaitForSeconds(0.1f);
        }
    }

    IEnumerator SpawnLeft(Vector2 shootPos)
    {
        for (int j = 0; j < musicnote.Length; j++)
        {
            MusicNote currMusicNote = Instantiate(musicnote[j], new Vector2(transform.position.x + .1f, transform.position.y + 0.3f), Quaternion.Inverse(musicnote[j].transform.rotation)) as MusicNote;
            Physics2D.IgnoreCollision(currMusicNote.GetComponent<Collider2D>(), musicnote[j].GetComponent<Collider2D>());
            currMusicNote.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;

            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currMusicNote.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currMusicNote.GetComponent<MusicNote>().ShootLeft();
            yield return new WaitForSeconds(0.15f);
        }
    }
}
